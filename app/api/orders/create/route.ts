import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMPPayment, MERCADOPAGO_ENV, type MPPaymentResponse } from "@/lib/mercadopago";
import { sendOrderCreatedEmail, sendPaymentConfirmedEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  variantId: string;
  productId: string;
  productName: string;
  size: string;
  sku: string;
  price: number;
  quantity: number;
}

interface BrickFormData {
  token: string;
  issuer_id?: string;
  payment_method_id: string;
  transaction_amount?: number;
  installments: number;
  payer?: {
    email?: string;
    identification?: { type: string; number: string };
  };
}

interface CreateOrderBody {
  customer: {
    nome: string;
    email: string;
    cpf: string;
    telefone: string;
  };
  address: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  shipping: {
    servico: string;
    codigo: string;
    preco: number;
    prazo: number;
  };
  payment: {
    method: "pix" | "credit_card" | "boleto";
    brickFormData?: BrickFormData;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitName(nome: string): { firstName: string; lastName: string } {
  const parts = nome.trim().split(/\s+/);
  return {
    firstName: parts[0] ?? nome,
    lastName: parts.slice(1).join(" ") || parts[0],
  };
}

function boletoExpiry(): string {
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return d.toISOString().replace("Z", "-03:00");
}

interface ReservedItem {
  variantId: string;
  productId: string;
  quantity: number;
  prevStock: number;
}

// ── POST /api/orders/create ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Admin client bypassa RLS — usado em todas as operações de estoque e pedido
  const admin = createAdminClient();
  // Reservas realizadas (para rollback em caso de falha)
  const reservedItems: ReservedItem[] = [];

  // Helper: desfaz todas as reservas de estoque feitas nesta requisição
  async function rollbackReservations() {
    if (reservedItems.length === 0) return;
    for (const r of reservedItems) {
      await admin
        .from("product_variants")
        .update({ stock_qty: r.prevStock })
        .eq("id", r.variantId);
      await admin.from("inventory_log").insert({
        variant_id: r.variantId,
        product_id: r.productId,
        type: "ajuste",
        sales_channel: "online",
        quantity: r.quantity,
        reason: "Reserva cancelada - pagamento não realizado",
      });
    }
    console.log(`[orders/create] Rollback de ${reservedItems.length} reserva(s) concluído.`);
  }

  try {
    const body = (await request.json()) as CreateOrderBody;
    const { customer, address, shipping, payment, items, subtotal, discount, couponCode } = body;

    // ── 1. Validação básica ──────────────────────────────────────────────────
    if (!items?.length) {
      return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
    }
    if (!payment.method) {
      return NextResponse.json({ error: "Forma de pagamento não informada." }, { status: 400 });
    }
    if (payment.method === "credit_card" && !payment.brickFormData?.token) {
      return NextResponse.json({ error: "Token do cartão não informado (brickFormData.token ausente)." }, { status: 400 });
    }

    // ── 2. Validar estoque (leitura atômica via adminClient) ─────────────────
    const variantIds = items.map((i) => i.variantId);

    const { data: variants, error: variantsErr } = await admin
      .from("product_variants")
      .select("id, stock_qty, size, color, product_id")
      .in("id", variantIds);

    if (variantsErr || !variants) {
      return NextResponse.json({ error: "Erro ao verificar estoque." }, { status: 500 });
    }

    for (const item of items) {
      const v = variants.find((x) => x.id === item.variantId);
      if (!v) {
        return NextResponse.json(
          { error: `Variação não encontrada: ${item.productName} (${item.size}).`, code: "OUT_OF_STOCK", variantId: item.variantId },
          { status: 409 }
        );
      }
      if (v.stock_qty < item.quantity) {
        return NextResponse.json(
          {
            error: `"${item.productName} — ${[v.color, v.size].filter(Boolean).join("/")}" está esgotado ou sem estoque suficiente. Remova-o do carrinho e tente novamente.`,
            code: "OUT_OF_STOCK",
            variantId: item.variantId,
          },
          { status: 409 }
        );
      }
    }

    // ── 3. Reservar estoque ANTES de chamar o Mercado Pago ──────────────────
    // Decrementa imediatamente para evitar overselling durante o processamento.
    for (const item of items) {
      const v = variants.find((x) => x.id === item.variantId)!;
      const newStock = Math.max(0, v.stock_qty - item.quantity);

      const { error: stockErr } = await admin
        .from("product_variants")
        .update({ stock_qty: newStock })
        .eq("id", item.variantId);

      if (stockErr) {
        console.error("[orders/create] Falha ao reservar estoque:", stockErr.message);
        // Reverter reservas já feitas
        await rollbackReservations();
        return NextResponse.json({ error: "Erro ao reservar estoque. Tente novamente." }, { status: 500 });
      }

      await admin.from("inventory_log").insert({
        variant_id: item.variantId,
        product_id: item.productId,
        type: "reserva",
        sales_channel: "online",
        quantity: -item.quantity,
        reason: "Reserva para pagamento em processamento",
      });

      reservedItems.push({ variantId: item.variantId, productId: item.productId, quantity: item.quantity, prevStock: v.stock_qty });
    }

    console.log(`[orders/create] ${reservedItems.length} item(s) reservado(s).`);

    // ── 4. Chamar Mercado Pago ───────────────────────────────────────────────
    const total = subtotal - discount + shipping.preco;
    const { firstName, lastName } = splitName(customer.nome);

    const customerCpf = customer.cpf.replace(/\D/g, "");
    // Fallback: se o cliente não tiver enviado CPF no formulário, usar o que
    // o próprio Brick coletou no iframe (identification.number do payer).
    const brickCpfRaw =
      payment.method === "credit_card"
        ? payment.brickFormData?.payer?.identification?.number?.replace(/\D/g, "") ?? ""
        : "";
    const cpfLimpo = customerCpf.length === 11 ? customerCpf : brickCpfRaw;
    const emailLimpo = customer.email.trim().toLowerCase();

    console.log("[orders/create] CPF customer:", customerCpf, "| length:", customerCpf.length);
    console.log("[orders/create] CPF brick:", brickCpfRaw, "| length:", brickCpfRaw.length);
    console.log("[orders/create] CPF final enviado ao MP:", cpfLimpo, "| length:", cpfLimpo.length);
    console.log("[orders/create] Email enviado ao MP:", emailLimpo);

    if (cpfLimpo.length !== 11) {
      await rollbackReservations();
      return NextResponse.json(
        {
          error:
            "CPF obrigatório para processar o pagamento. Volte à etapa de Dados Pessoais e preencha um CPF válido.",
          code: "INVALID_CPF",
        },
        { status: 400 }
      );
    }

    const mpPayment = getMPPayment();
    let mpResponse: MPPaymentResponse;

    try {
      const commonPayer = {
        email: emailLimpo,
        first_name: firstName,
        last_name: lastName,
        identification: { type: "CPF", number: cpfLimpo },
      };

      if (payment.method === "pix") {
        const pixBody = {
          transaction_amount: parseFloat(total.toFixed(2)),
          payment_method_id: "pix",
          payer: commonPayer,
          description: "Pedido Kary Curadoria",
        };
        console.log("[MP Payment] PIX payload:", JSON.stringify(pixBody, null, 2));
        mpResponse = (await mpPayment.create({ body: pixBody })) as MPPaymentResponse;
        console.log("[MP Payment] PIX response:", JSON.stringify(mpResponse, null, 2));

      } else if (payment.method === "credit_card") {
        const brick = payment.brickFormData!;
        const brickCpf = brick.payer?.identification?.number?.replace(/\D/g, "") ?? cpfLimpo;

        console.log("[orders/create] Credit card via Brick");
        console.log("  token prefix:", brick.token.slice(0, 12));
        console.log("  payment_method_id:", brick.payment_method_id);
        console.log("  installments:", brick.installments);
        console.log("  issuer_id:", brick.issuer_id);
        console.log("  CPF (customer):", cpfLimpo, "| CPF (brick payer):", brickCpf);

        const cardBody = {
          transaction_amount: parseFloat(total.toFixed(2)),
          token: brick.token,
          description: "Pedido Kary Curadoria",
          installments: brick.installments ?? 1,
          payment_method_id: brick.payment_method_id,
          issuer_id: brick.issuer_id ? Number(brick.issuer_id) : undefined,
          payer: {
            email: emailLimpo,
            identification: { type: "CPF", number: cpfLimpo },
          },
        };
        // Mascara o token nos logs — mantém apenas prefixo para debug
        console.log("[MP Payment] CARD payload:", JSON.stringify(
          { ...cardBody, token: `${brick.token.slice(0, 12)}...` },
          null,
          2
        ));

        mpResponse = (await mpPayment.create({ body: cardBody })) as MPPaymentResponse;
        console.log("[MP Payment] CARD response:", JSON.stringify(mpResponse, null, 2));

        // Cartão recusado → reverter reservas e retornar erro.
        // Nenhum pedido é salvo no banco — o cliente pode tentar novamente
        // com novos dados ou escolher outro método de pagamento.
        if (mpResponse.status === "rejected") {
          await rollbackReservations();
          const detail = mpResponse.status_detail ?? null;
          console.log("[MP Payment] CARD rejected | status_detail:", detail);
          return NextResponse.json(
            {
              error: `Pagamento recusado pelo banco.`,
              code: "PAYMENT_REJECTED",
              // status_detail permite ao frontend exibir mensagem específica
              // (cc_rejected_insufficient_funds, cc_rejected_bad_filled_card_number etc.)
              status_detail: detail,
            },
            { status: 402 }
          );
        }

      } else {
        // boleto
        const zipCode = address.cep.replace(/\D/g, "");
        const streetName = address.logradouro?.trim();
        const streetNumber = address.numero?.trim();
        const neighborhood = address.bairro?.trim();
        const city = address.cidade?.trim();
        const state = address.estado?.trim();

        const missingFields: string[] = [];
        if (!zipCode || zipCode.length < 8) missingFields.push("CEP");
        if (!streetName) missingFields.push("Logradouro");
        if (!streetNumber) missingFields.push("Número");
        if (!neighborhood) missingFields.push("Bairro");
        if (!city) missingFields.push("Cidade");
        if (!state) missingFields.push("Estado");

        if (missingFields.length > 0) {
          await rollbackReservations();
          return NextResponse.json(
            {
              error: `Endereço incompleto para emissão do boleto. Campo(s) faltando: ${missingFields.join(", ")}.`,
              code: "INCOMPLETE_ADDRESS",
            },
            { status: 400 }
          );
        }

        const boletoBody = {
          transaction_amount: parseFloat(total.toFixed(2)),
          payment_method_id: "bolbradesco",
          description: "Pedido Kary Curadoria",
          date_of_expiration: boletoExpiry(),
          payer: {
            ...commonPayer,
            address: {
              zip_code: zipCode,
              street_name: streetName,
              street_number: streetNumber,
              neighborhood,
              city,
              federal_unit: state,
            },
          },
        };
        console.log("[MP Payment] BOLETO payload:", JSON.stringify(boletoBody, null, 2));
        mpResponse = (await mpPayment.create({ body: boletoBody })) as MPPaymentResponse;
        console.log("[MP Payment] BOLETO response:", JSON.stringify(mpResponse, null, 2));
      }
    } catch (err) {
      const errMsg = (err as Error).message ?? "";
      console.error("[orders/create] Mercado Pago error:", errMsg);

      // MP SDK geralmente anexa a resposta completa em `err.cause` ou `err.response`
      // — loga TUDO que puder identificar a causa real (códigos 2067, 3033, etc.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyErr = err as any;
      try {
        console.error("[MP Payment] error.cause:", JSON.stringify(anyErr?.cause ?? null, null, 2));
      } catch { console.error("[MP Payment] error.cause (raw):", anyErr?.cause); }
      try {
        console.error("[MP Payment] error.response:", JSON.stringify(anyErr?.response ?? null, null, 2));
      } catch { console.error("[MP Payment] error.response (raw):", anyErr?.response); }
      console.error("[MP Payment] error.status:", anyErr?.status);
      console.error("[MP Payment] error.name:", anyErr?.name);
      try {
        console.error("[MP Payment] error (full):", JSON.stringify(anyErr, Object.getOwnPropertyNames(anyErr ?? {}), 2));
      } catch { /* ignore circular */ }

      // Reverter reservas em qualquer exceção do MP
      await rollbackReservations();

      if (
        errMsg.includes("2067") ||
        errMsg.toLowerCase().includes("identification") ||
        errMsg.toLowerCase().includes("invalid user")
      ) {
        return NextResponse.json(
          { error: "CPF inválido para pagamento. Verifique se o CPF informado está correto.", code: "INVALID_CPF" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Erro no pagamento: ${errMsg}`, code: "PAYMENT_FAILED" },
        { status: 502 }
      );
    }

    const mpPaymentId = String(mpResponse.id);
    const mpStatus = mpResponse.status ?? "pending";

    // ── 5. Salvar pedido no banco ────────────────────────────────────────────
    const shippingAddress = {
      cep: address.cep,
      logradouro: address.logradouro,
      numero: address.numero,
      complemento: address.complemento ?? "",
      bairro: address.bairro,
      cidade: address.cidade,
      estado: address.estado,
    };

    // Cartão aprovado → 'paid'; pix/boleto → 'pending'
    const orderStatus =
      payment.method === "credit_card" && mpStatus === "approved" ? "paid" : "pending";

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        guest_name: customer.nome,
        guest_email: customer.email,
        guest_cpf: cpfLimpo,
        customer_phone: customer.telefone?.replace(/\D/g, "") || null,
        status: orderStatus,
        subtotal,
        shipping_cost: shipping.preco,
        shipping_service: shipping.servico,
        shipping_deadline: shipping.prazo,
        discount,
        coupon_code: couponCode ?? null,
        total,
        payment_method: payment.method,
        pagbank_charge_id: mpPaymentId,
        pagbank_status: mpStatus,
        shipping_address_json: shippingAddress,
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      console.error("[orders/create] DB insert failed after MP charge:", { mpPaymentId, mpStatus, orderErr });
      // Não reverter estoque aqui — pagamento foi aprovado; equipe precisa resolver manualmente
      return NextResponse.json(
        { error: "Pagamento processado, mas houve erro ao salvar o pedido. Entre em contato com o suporte." },
        { status: 500 }
      );
    }

    // ── 5b. Marcar abandono como recuperado (fire-and-forget) ───────────────
    // Regra: só é "abandono recuperado" se o cliente demorou ≥ 60 min para
    // finalizar a compra após o registro ser capturado. Se comprou em menos de
    // 60 min, era uma compra direta — deletamos o registro para não poluir
    // as métricas de recuperação.
    Promise.resolve((async () => {
      try {
        const { data: abandoned } = await admin
          .from("abandoned_checkouts")
          .select("id, created_at")
          .eq("email", customer.email.trim().toLowerCase())
          .eq("recovered", false)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!abandoned) return;

        const minutesSinceCapture =
          (Date.now() - new Date(abandoned.created_at).getTime()) / 1000 / 60;

        if (minutesSinceCapture < 60) {
          // Compra direta — remover registro (não houve abandono real)
          await admin
            .from("abandoned_checkouts")
            .delete()
            .eq("id", abandoned.id);
          console.log(
            `[orders/create] Abandono removido (compra direta em ${minutesSinceCapture.toFixed(1)} min): ${abandoned.id}`
          );
        } else {
          // Abandono real recuperado — marcar
          await admin
            .from("abandoned_checkouts")
            .update({
              recovered: true,
              order_id: order.id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", abandoned.id);
          console.log(
            `[orders/create] Abandono recuperado após ${minutesSinceCapture.toFixed(1)} min: ${abandoned.id}`
          );
        }
      } catch { /* não bloquear o pedido */ }
    })());

    // ── 6. Inserir itens do pedido ───────────────────────────────────────────
    const orderItems = items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      variant_id: i.variantId,
      product_name: i.productName,
      size_snapshot: i.size,
      color_snapshot: (i as { color?: string | null }).color ?? null,
      sku_snapshot: i.sku,
      quantity: i.quantity,
      unit_price: i.price,
      total_price: i.price * i.quantity,
    }));

    const { error: itemsErr } = await admin.from("order_items").insert(orderItems);
    if (itemsErr) {
      console.error("[orders/create] Failed to insert order_items:", itemsErr);
    }

    // ── 7. Vincular reservas ao pedido (inventory_log) ───────────────────────
    // Atualiza os registros de 'reserva' com o order_id e muda tipo para 'saida'
    // para que o trigger não faça dupla baixa.
    for (const item of items) {
      await admin
        .from("inventory_log")
        .update({
          order_id: order.id,
          type: orderStatus === "paid" ? "saida" : "reserva",
          reason:
            orderStatus === "paid"
              ? `Venda online pedido #${order.order_number}`
              : `Reserva aguardando pagamento - pedido #${order.order_number}`,
        })
        .eq("variant_id", item.variantId)
        .eq("type", "reserva")
        .is("order_id", null);
    }

    // ── 8. Disparar e-mail de confirmação ───────────────────────────────────
    try {
      console.log("[email] Enviando confirmação para:", customer.email);
      console.log("[email] EMAIL_FROM:", process.env.EMAIL_FROM ?? "(não definido)");
      console.log("[email] RESEND_API_KEY definida:", Boolean(process.env.RESEND_API_KEY));
      await sendOrderCreatedEmail({
        to: customer.email,
        orderNumber: String(order.order_number),
        customerName: customer.nome,
        items: items.map((i) => ({
          name: i.productName,
          variant: i.size,
          color: (i as { color?: string | null }).color ?? undefined,
          quantity: i.quantity,
          unit_price: i.price,
        })),
        subtotal,
        shippingCost: shipping.preco,
        discount,
        total,
        paymentMethod: payment.method,
        pixCode: payment.method === "pix"
          ? mpResponse.point_of_interaction?.transaction_data?.qr_code ?? undefined
          : undefined,
        boletoUrl: payment.method === "boleto"
          ? (mpResponse.transaction_details?.external_resource_url ?? undefined)
          : undefined,
        boletoBarcode: payment.method === "boleto"
          ? (mpResponse.barcode?.content ?? undefined)
          : undefined,
      });
      console.log("[email] Confirmação enviada com sucesso para:", customer.email);
    } catch (emailErr) {
      const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
      const stack = emailErr instanceof Error ? emailErr.stack : "";
      console.error("[email] ERRO ao enviar confirmação:", msg);
      console.error("[email] Stack:", stack);
    }

    // ── 9. E-mail de pagamento confirmado para cartão aprovado ──────────────
    // PIX e boleto disparam via webhook quando o pagamento é confirmado.
    // Cartão aprovado é síncrono — o webhook chega depois mas vê wasAlreadyPaid
    // e pula. Por isso enviamos o e-mail de confirmação aqui.
    if (payment.method === "credit_card" && mpStatus === "approved") {
      try {
        const emailItems = items.map((i) => ({
          name: i.productName,
          variant: i.size,
          color: (i as { color?: string | null }).color ?? undefined,
          quantity: i.quantity,
          unit_price: i.price,
        }));
        await sendPaymentConfirmedEmail({
          to: customer.email,
          orderNumber: String(order.order_number),
          customerName: customer.nome,
          items: emailItems,
          total,
        });
        console.log("[email] Pagamento confirmado enviado para:", customer.email);
      } catch (emailErr) {
        console.error("[email] ERRO ao enviar pagamento confirmado:", emailErr);
      }
    }

    // ── 10. Montar resposta por método de pagamento ──────────────────────────
    const base = { orderId: order.id, orderNumber: order.order_number };

    if (payment.method === "pix") {
      const txData = mpResponse.point_of_interaction?.transaction_data;
      return NextResponse.json({
        ...base,
        qrCode: txData?.qr_code_base64 ?? null,
        qrCodeText: txData?.qr_code ?? null,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
    }

    if (payment.method === "boleto") {
      return NextResponse.json({
        ...base,
        boletoLine: mpResponse.barcode?.content ?? null,
        boletoPdf: mpResponse.transaction_details?.external_resource_url ?? null,
      });
    }

    // credit_card
    return NextResponse.json({ ...base, mpEnv: MERCADOPAGO_ENV });

  } catch (err) {
    console.error("[orders/create] Unexpected error:", err);
    await rollbackReservations();
    return NextResponse.json(
      { error: `Erro interno: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
