import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
      .select("id, status, order_number")
      .eq("pagbank_charge_id", String(paymentId))
      .single();

    if (!order) {
      console.log("[Webhook MP] Pedido não encontrado para payment:", paymentId);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Atualizar status do pedido conforme status do MP
    if (payment.status === "approved") {
      await admin
        .from("orders")
        .update({
          status: "paid",
          pagbank_status: "approved",
        })
        .eq("id", order.id);

      console.log(`[Webhook MP] Pedido #${order.order_number} marcado como PAGO`);
    } else if (
      payment.status === "rejected" ||
      payment.status === "cancelled"
    ) {
      await admin
        .from("orders")
        .update({
          status: "cancelled",
          pagbank_status: payment.status,
        })
        .eq("id", order.id);

      console.log(
        `[Webhook MP] Pedido #${order.order_number} marcado como CANCELADO (${payment.status})`
      );
    }

    // Sempre retornar 200 para o MP não reenviar
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[Webhook MP] Erro interno:", error);
    // Mesmo com erro retornar 200 — o MP não deve reenviar por falha nossa
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
