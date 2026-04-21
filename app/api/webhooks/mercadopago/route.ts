import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentConfirmedEmail, sendOrderCancelledEmail, sendLowStockAlertEmail } from "@/lib/email/send";

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
      .select("id, status, order_number, guest_name, guest_email, total, order_items(product_name, size_snapshot, quantity, unit_price)")
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

      // Verificar estoque baixo após débito (trigger Supabase já rodou)
      try {
        const { data: lowStock } = await admin
          .from("product_variants")
          .select("id, sku, size, color, stock_qty, products!inner(name)")
          .lte("stock_qty", 3)
          .eq("active", true);

        if (lowStock && lowStock.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const items = lowStock.map((v: any) => ({
            productName: Array.isArray(v.products) ? v.products[0]?.name ?? "—" : v.products?.name ?? "—",
            variantLabel: [v.size, v.color].filter(Boolean).join(" / ") || "—",
            sku: v.sku ?? "—",
            stock: v.stock_qty,
          }));
          await sendLowStockAlertEmail(items);
        }
      } catch (stockErr) {
        console.error("[Webhook MP] Falha ao verificar/enviar alerta de estoque:", stockErr);
      }
    } else if (
      payment.status === "rejected" ||
      payment.status === "cancelled"
    ) {
      // Snapshot do estado ANTES do update — determina a mensagem do e-mail.
      // "paid" ou "approved" → era um pedido já pago (estorno → wasAlreadyPaid=true).
      // "pending" ou outro → pagamento nunca foi identificado (wasAlreadyPaid=false).
      const wasAlreadyPaid = order.status === "paid";

      await admin
        .from("orders")
        .update({
          status: "cancelled",
          pagbank_status: payment.status,
        })
        .eq("id", order.id);

      console.log(
        `[Webhook MP] Pedido #${order.order_number} marcado como CANCELADO (${payment.status}) | wasAlreadyPaid: ${wasAlreadyPaid}`
      );

      // E-mail de cancelamento
      if (order.guest_email) {
        try {
          await sendOrderCancelledEmail({
            to: order.guest_email,
            orderNumber: String(order.order_number),
            customerName: order.guest_name ?? "Cliente",
            total: order.total,
            reason:
              payment.status === "rejected"
                ? "Pagamento recusado"
                : wasAlreadyPaid
                  ? "Pagamento estornado"
                  : "Pagamento não identificado dentro do prazo",
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
