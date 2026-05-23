import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentConfirmedEmail, sendOrderCancelledEmail, sendLowStockAlertEmail } from "@/lib/email/send";

// Semântica dos status MP no contexto do KVO:
//
// "approved"  → pagamento aprovado → order.status = 'paid'
// "rejected"  → cartão recusado → order.status = 'cancelled'
//               estoque reservado é revertido + e-mail de cancelamento.
//               Não há como recuperar o mesmo pedido; cliente refaz o checkout.
// "cancelled" → pagamento cancelado pelo MP/banco/cliente
//               → order.status = 'cancelled' + e-mail de cancelamento

export const runtime = "nodejs";
export const maxDuration = 30;

// ── Mercado Pago Webhook (IPN) ────────────────────────────────────────────────
// MP envia POST com body: { "type": "payment", "data": { "id": "12345678" } }
// Sempre retornar HTTP 200 para evitar reenvios.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Log para debug
    console.log("[Webhook MP] Recebido:", JSON.stringify(body));

    // Processar apenas notificações de pagamento
    if (body.type !== "payment") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Buscar status do pagamento diretamente na API do MP
    const mpToken =
      process.env.MERCADOPAGO_ENV === "production"
        ? process.env.MERCADOPAGO_ACCESS_TOKEN_PRODUCTION
        : process.env.MERCADOPAGO_ACCESS_TOKEN_SANDBOX;

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!mpResponse.ok) {
      console.error("[Webhook MP] Erro ao buscar pagamento:", paymentId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const payment = await mpResponse.json();
    console.log("[Webhook MP] Status do pagamento:", payment.status);

    // Buscar pedido pelo ID do pagamento MP (armazenado em pagbank_charge_id)
    const admin = createAdminClient();
    const { data: order } = await admin
      .from("orders")
      .select("id, status, order_number, guest_name, guest_email, total, order_items(variant_id, product_name, size_snapshot, color_snapshot, quantity, unit_price)")
      .eq("pagbank_charge_id", String(paymentId))
      .single();

    if (!order) {
      console.log("[Webhook MP] Pedido não encontrado para payment:", paymentId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Atualizar status do pedido conforme status do MP
    if (payment.status === "approved") {
      const wasAlreadyPaid = order.status === "paid";

      await admin
        .from("orders")
        .update({
          status: "paid",
          pagbank_status: "approved",
        })
        .eq("id", order.id);

      console.log(`[Webhook MP] Pedido #${order.order_number} marcado como PAGO`);

      if (!wasAlreadyPaid) {
        await admin
          .from("inventory_log")
          .update({
            type: "saida",
            sales_channel: "online",
            reason: `Venda online pedido #${order.order_number}`,
          })
          .eq("order_id", order.id)
          .eq("type", "reserva");
      }

      // E-mail de pagamento confirmado
      if (!wasAlreadyPaid && order.guest_email) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = (order as any).order_items ?? [];
          await sendPaymentConfirmedEmail({
            to: order.guest_email,
            orderNumber: String(order.order_number),
            customerName: order.guest_name ?? "Cliente",
            items: items.map((i: { product_name: string; size_snapshot?: string; quantity: number; unit_price: number }) => ({
              name: i.product_name,
              variant: i.size_snapshot ?? undefined,
              quantity: i.quantity,
              unit_price: i.unit_price,
            })),
            total: order.total,
          });
        } catch (emailErr) {
          console.error("[Webhook MP] Falha ao enviar e-mail de pagamento confirmado:", emailErr);
        }
      }

      // Verificar estoque baixo apenas para variantes deste pedido
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orderItems = (order as any).order_items ?? [];
        const orderVariantIds: string[] = orderItems
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((i: any) => i.variant_id)
          .filter(Boolean);

        if (orderVariantIds.length > 0) {
          const { data: orderVariants } = await admin
            .from("product_variants")
            .select("id, sku, size, color, stock_qty, stock_min, products!inner(name, sku_base)")
            .in("id", orderVariantIds);

          // Filtra em JS: só itens abaixo do stock_min individual de cada variante
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lowStock = (orderVariants ?? []).filter((v: any) => v.stock_qty <= v.stock_min);

          if (lowStock.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const alertItems = lowStock.map((v: any) => {
              const prod = Array.isArray(v.products) ? v.products[0] : v.products;
              return {
                sku: v.sku ?? "—",
                size: v.size ?? "—",
                color: v.color ?? null,
                stock_qty: v.stock_qty,
                stock_min: v.stock_min,
                productName: prod?.name ?? "—",
                skuBase: prod?.sku_base ?? "—",
              };
            });
            await sendLowStockAlertEmail({
              orderNumber: String(order.order_number),
              items: alertItems,
            });
          }
        }
      } catch (stockErr) {
        console.error("[Webhook MP] Falha ao verificar/enviar alerta de estoque:", stockErr);
      }
    } else if (payment.status === "rejected") {
      // ── Cartão recusado ──────────────────────────────────────────────────
      // Cartão negado, saldo insuficiente, alto risco, dados inválidos etc.
      // Não há como recuperar o mesmo pedido — cancela e reverte o estoque.
      // Cliente precisará refazer o checkout com outro cartão ou via PIX.

      const reason = payment.status_detail ?? "rejected";

      // 1. Cancelar o pedido
      await admin
        .from("orders")
        .update({
          status: "cancelled",
          pagbank_status: "rejected",
          notes: `Pagamento recusado em ${new Date().toISOString()} | motivo: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // 2. Reverter estoque reservado para cada item do pedido
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rejectedItems = (order as any).order_items ?? [];
      for (const item of rejectedItems) {
        // Lê estoque atual e soma de volta a quantidade reservada
        const { data: variant } = await admin
          .from("product_variants")
          .select("stock_qty")
          .eq("id", item.variant_id)
          .single();

        if (variant) {
          await admin
            .from("product_variants")
            .update({ stock_qty: variant.stock_qty + item.quantity })
            .eq("id", item.variant_id);
        }

        // Atualiza o log de inventário: reserva → ajuste (estorno)
        await admin
          .from("inventory_log")
          .update({
            type: "ajuste",
            reason: `Reserva revertida — pagamento recusado (${reason}) — pedido #${order.order_number}`,
          })
          .eq("order_id", order.id)
          .eq("variant_id", item.variant_id)
          .eq("type", "reserva");
      }

      console.log(
        `[Webhook MP] Pedido #${order.order_number} — CANCELADO e estoque revertido (${reason})`
      );

      // 3. E-mail informando o cliente
      if (order.guest_email) {
        try {
          await sendOrderCancelledEmail({
            to: order.guest_email,
            orderNumber: String(order.order_number),
            customerName: order.guest_name ?? "Cliente",
            total: order.total,
            reason: "Pagamento recusado",
            wasAlreadyPaid: false,
          });
        } catch (emailErr) {
          console.error("[Webhook MP] Falha ao enviar e-mail de cancelamento (rejected):", emailErr);
        }
      }

    } else if (payment.status === "cancelled") {
      // ── Pagamento cancelado de forma definitiva ──────────────────────────
      // Ex.: PIX expirado pelo MP, cancelamento de boleto, estorno confirmado.
      // Aqui sim cancela o pedido e envia e-mail.

      // Snapshot do estado ANTES do update para determinar a mensagem do e-mail.
      const wasAlreadyPaid = order.status === "paid";

      await admin
        .from("orders")
        .update({
          status: "cancelled",
          pagbank_status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      console.log(
        `[Webhook MP] Pedido #${order.order_number} marcado como CANCELADO | wasAlreadyPaid: ${wasAlreadyPaid}`
      );

      // E-mail de cancelamento
      if (order.guest_email) {
        try {
          await sendOrderCancelledEmail({
            to: order.guest_email,
            orderNumber: String(order.order_number),
            customerName: order.guest_name ?? "Cliente",
            total: order.total,
            reason: wasAlreadyPaid ? "Pagamento estornado" : "Pagamento não identificado dentro do prazo",
            wasAlreadyPaid,
          });
        } catch (emailErr) {
          console.error("[Webhook MP] Falha ao enviar e-mail de cancelamento:", emailErr);
        }
      }
    }

    // Sempre retornar 200 para o MP não reenviar
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[Webhook MP] Erro interno:", error);
    // Mesmo com erro retornar 200 — o MP não deve reenviar por falha nossa
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
