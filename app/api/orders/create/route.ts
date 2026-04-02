import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMPPayment, MERCADOPAGO_ENV, type MPPaymentResponse } from "@/lib/mercadopago";
import { sendOrderCreatedEmail } from "@/lib/email/send";

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

// Estrutura do formData entregue pelo Payment Brick do MP
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
    // Payment Brick entrega o formData diretamente (token já incluído)
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
  // 3 dias corridos a partir de agora, horário de Brasília (UTC-3)
  const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  return d.toISOString().replace("Z", "-03:00");
}

// ── POST /api/orders/create ───────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateOrderBody;
    const { customer, address, shipping, payment, items, subtotal, discount, couponCode } = body;

    // ── 1. Validação básica ──
    if (!items?.length) {
      return NextResponse.json({ error: "Carrinho vazio." }, { status: 400 });
    }
    if (!payment.method) {
      return NextResponse.json({ error: "Forma de pagamento não informada." }, { status: 400 });
    }
    if (payment.method === "credit_card" && !payment.brickFormData?.token) {
      return NextResponse.json({ error: "Token do cartão não informado (brickFormData.token ausente)." }, { status: 400 });
    }

    // ── 2. Verificação de estoque (somente leitura) ──
    const supabase = createClient();
    const variantIds = items.map((i) => i.variantId);

    const { data: variants, error: variantsErr } = await supabase
      .from("product_variants")
      .select("id, stock_qty, size, product_id")
      .in("id", variantIds);

    if (variantsErr || !variants) {
      return NextResponse.json({ error: "Erro ao verificar estoque." }, { status: 500 });
    }

    for (const item of items) {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant) {
        return NextResponse.json(
          { error: `Variação não encontrada: ${item.productName} (${item.size}).` },
          { status: 400 }
        );
      }
      if (variant.stock_qty < item.quantity) {
        return NextResponse.json(
          {
            error: `Estoque insuficiente para "${item.productName}" (${item.size}). Disponível: ${variant.stock_qty}.`,
          },
          { status: 409 }
        );
      }
    }

    // ── 3. Criar pagamento no Mercado Pago ANTES de salvar no banco ──
    const total = subtotal - discount + shipping.preco;
    const { firstName, lastName } = splitName(customer.nome);

    // CPF: sanitizar aqui independente de como chegou do frontend
    // (remove pontos, traços e qualquer não-dígito)
    const cpfLimpo = customer.cpf.replace(/\D/g, "");
    const emailLimpo = customer.email.trim().toLowerCase();

    console.log("[orders/create] CPF enviado ao MP:", cpfLimpo, "| length:", cpfLimpo.length);
    console.log("[orders/create] Email enviado ao MP:", emailLimpo);

    if (cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: `CPF inválido: esperado 11 dígitos, recebido ${cpfLimpo.length}.` },
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
        mpResponse = (await mpPayment.create({
          body: {
            transaction_amount: parseFloat(total.toFixed(2)),
            payment_method_id: "pix",
            payer: commonPayer,
            description: "Pedido Kary Curadoria",
          },
        })) as MPPaymentResponse;

      } else if (payment.method === "credit_card") {
        const brick = payment.brickFormData!;

        // CPF que veio dentro do formData do Brick (pode ter máscara se usuário editou)
        const brickCpf = brick.payer?.identification?.number?.replace(/\D/g, "") ?? cpfLimpo;

        console.log("[orders/create] Credit card via Brick");
        console.log("  token prefix:", brick.token.slice(0, 12));
        console.log("  payment_method_id:", brick.payment_method_id);
        console.log("  installments:", brick.installments);
        console.log("  issuer_id:", brick.issuer_id);
        console.log("  CPF (customer):", cpfLimpo, "| CPF (brick payer):", brickCpf);
        console.log("  email:", emailLimpo);

        // Usamos sempre o CPF do nosso form (já validado acima),
        // garantindo que está limpo mesmo que o Brick devolva com máscara
        mpResponse = (await mpPayment.create({
          body: {
            transaction_amount: parseFloat(total.toFixed(2)),
            token: brick.token,
            description: "Pedido Kary Curadoria",
            installments: brick.installments ?? 1,
            payment_method_id: brick.payment_method_id,
            issuer_id: brick.issuer_id ? Number(brick.issuer_id) : undefined,
            payer: {
              email: emailLimpo,
              identification: {
                type: "CPF",
                number: cpfLimpo,   // sempre dígitos puros, validado acima
              },
            },
          },
        })) as MPPaymentResponse;

        // Cartão recusado → retornar erro imediatamente (não criar pedido)
        if (mpResponse.status === "rejected") {
          return NextResponse.json(
            { error: `Pagamento recusado: ${mpResponse.status_detail ?? "cartão não autorizado"}.` },
            { status: 402 }
          );
        }

      } else {
        // boleto — o MP exige endereço completo no payer para boleto registrado
        const zipCode = address.cep.replace(/\D/g, "");
        const streetName = address.logradouro?.trim();
        const streetNumber = address.numero?.trim();
        const neighborhood = address.bairro?.trim();
        const city = address.cidade?.trim();
        const state = address.estado?.trim();

        console.log("[orders/create] Boleto address:", {
          zip_code: zipCode,
          street: streetName,
          number: streetNumber,
          neighborhood,
          city,
          state,
        });

        // Validação antecipada — retorna 400 em vez de deixar o MP devolver 400/422
        const missingFields: string[] = [];
        if (!zipCode || zipCode.length < 8) missingFields.push("CEP");
        if (!streetName) missingFields.push("Logradouro");
        if (!streetNumber) missingFields.push("Número");
        if (!neighborhood) missingFields.push("Bairro");
        if (!city) missingFields.push("Cidade");
        if (!state) missingFields.push("Estado");

        if (missingFields.length > 0) {
          return NextResponse.json(
            {
              error: `Endereço incompleto para emissão do boleto. Campo(s) faltando: ${missingFields.join(", ")}.`,
              code: "INCOMPLETE_ADDRESS",
            },
            { status: 400 }
          );
        }

        mpResponse = (await mpPayment.create({
          body: {
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
          },
        })) as MPPaymentResponse;
      }
    } catch (err) {
      const errMsg = (err as Error).message ?? "";
      console.error("[orders/create] Mercado Pago error:", errMsg);

      // Código 2067: CPF inválido matematicamente → retornar 400 (erro do cliente)
      // Também cobre mensagens como "Invalid user identification number"
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
        { error: `Erro no pagamento: ${errMsg}` },
        { status: 502 }
      );
    }

    const mpPaymentId = String(mpResponse.id);
    const mpStatus = mpResponse.status ?? "pending";

    // ── 4. Salvar pedido no banco (admin client bypassa RLS) ──
    const admin = createAdminClient();

    const shippingAddress = {
      cep: address.cep,
      logradouro: address.logradouro,
      numero: address.numero,
      complemento: address.complemento ?? "",
      bairro: address.bairro,
      cidade: address.cidade,
      estado: address.estado,
    };

    // Cartão aprovado → status 'paid' direto; pix/boleto → 'pending'
    const orderStatus =
      payment.method === "credit_card" && mpStatus === "approved" ? "paid" : "pending";

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .insert({
        guest_name: customer.nome,
        guest_email: customer.email,
        guest_cpf: cpfLimpo,
        status: orderStatus,
        subtotal,
        shipping_cost: shipping.preco,
        shipping_service: shipping.servico,
        shipping_deadline: shipping.prazo,
        discount,
        coupon_code: couponCode ?? null,
        total,
        payment_method: payment.method,
        pagbank_charge_id: mpPaymentId,   // reutiliza coluna para ID do MP
        pagbank_status: mpStatus,          // reutiliza coluna para status do MP
        shipping_address_json: shippingAddress,
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      console.error("[orders/create] DB insert failed after MP charge:", {
        mpPaymentId,
        mpStatus,
        orderErr,
      });
      return NextResponse.json(
        { error: "Pagamento processado, mas houve erro ao salvar o pedido. Entre em contato com o suporte." },
        { status: 500 }
      );
    }

    // ── 5. Inserir itens do pedido ──
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

    // ── 6. Disparar e-mail de confirmação (não bloqueia resposta) ──
    try {
      await sendOrderCreatedEmail({
        to: customer.email,
        orderNumber: String(order.order_number),
        customerName: customer.nome,
        items: items.map((i) => ({
          name: i.productName,
          variant: i.size,
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
    } catch (emailErr) {
      console.error("[orders/create] Falha ao enviar e-mail de confirmação:", emailErr);
    }

    // ── 7. Montar resposta por método de pagamento ──
    const base = { orderId: order.id, orderNumber: order.order_number };

    if (payment.method === "pix") {
      const txData = mpResponse.point_of_interaction?.transaction_data;
      return NextResponse.json({
        ...base,
        qrCode: txData?.qr_code_base64 ?? null,      // base64 puro (sem prefixo)
        qrCodeText: txData?.qr_code ?? null,          // copia-e-cola
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
    return NextResponse.json(
      { error: `Erro interno: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
