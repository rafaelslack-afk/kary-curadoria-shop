import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOrderExpired } from "@/lib/order-expiration";
import { sendOrderCancelledEmail } from "@/lib/email/send";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/cancel-expired-orders
 *
 * Cancela automaticamente pedidos `pending` que ultrapassaram o prazo
 * definido em `lib/order-expiration.ts` para seu método de pagamento:
 * - pix: 60 minutos
 * - boleto: 5 dias (7200 minutos)
 * - credit_card / debit_card: nunca (aprovação síncrona no checkout)
 *
 * Rota protegida por `CRON_SECRET` — a Vercel envia esse header
 * automaticamente quando o cron é disparado via `vercel.json`.
 *
 * Fluxo por pedido expirado:
 * 1. `orders.status` → `cancelled` + nota explicativa
 * 2. Reverter estoque dos `order_items` (devolve ao `product_variants.stock_qty`)
 *    e registrar em `inventory_log`
 * 3. Enviar e-mail de cancelamento com `wasAlreadyPaid: false`
 *
 * Sempre retorna 200 mesmo se houver falhas parciais — o corpo inclui
 * a contagem de sucesso/erro para monitoramento.
 */
export async function GET(request: NextRequest) {
  // Autenticação — Vercel Cron envia `Authorization: Bearer $CRON_SECRET`
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/cancel-expired] CRON_SECRET não configurado.");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const startedAt = new Date().toISOString();

  // ── 1. Buscar todos os pedidos pending ────────────────────────────────────
  const { data: orders, error: selectErr } = await admin
    .from("orders")
    .select(
      "id, order_number, payment_method, created_at, pagbank_status, guest_email, guest_name, customer_id, total"
    )
    .eq("status", "pending");

  if (selectErr) {
    console.error("[cron/cancel-expired] Erro ao buscar pedidos:", selectErr.message);
    return NextResponse.json({ error: selectErr.message }, { status: 500 });
  }

  const pendingOrders = orders ?? [];
  const toCancel = pendingOrders.filter((o) =>
    isOrderExpired(o.payment_method, o.created_at)
  );

  console.log(
    `[cron/cancel-expired] ${pendingOrders.length} pending / ${toCancel.length} a cancelar.`
  );

  // ── 2. Cancelar cada um ───────────────────────────────────────────────────
  const results = {
    cancelled: 0,
    emailsSent: 0,
    emailsFailed: 0,
    stockReverted: 0,
    errors: [] as string[],
  };

  for (const order of toCancel) {
    try {
      // 2a. Atualiza status para cancelled
      const { error: updateErr } = await admin
        .from("orders")
        .update({
          status: "cancelled",
          notes: "Cancelado automaticamente por expiração de prazo de pagamento.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateErr) {
        results.errors.push(`order ${order.order_number}: ${updateErr.message}`);
        continue;
      }
      results.cancelled++;

      // 2b. Reverter estoque reservado — devolve qty ao product_variants
      const { data: items } = await admin
        .from("order_items")
        .select("variant_id, product_id, quantity")
        .eq("order_id", order.id);

      for (const item of items ?? []) {
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

          await admin.from("inventory_log").insert({
            variant_id: item.variant_id,
            product_id: item.product_id,
            type: "ajuste",
            sales_channel: "online",
            quantity: item.quantity,
            reason: `Reserva cancelada por expiração — pedido #${order.order_number}`,
          });

          results.stockReverted++;
        }
      }

      // 2c. Resolver e-mail e nome do cliente (guest OU customer)
      let email = order.guest_email as string | null;
      let name = order.guest_name as string | null;

      if (order.customer_id) {
        const { data: customer } = await admin
          .from("customers")
          .select("email, name")
          .eq("id", order.customer_id)
          .single();
        if (customer) {
          email = customer.email ?? email;
          name = customer.name ?? name;
        }
      }

      // 2d. Enviar e-mail de cancelamento
      // wasAlreadyPaid = false — por definição este pedido estava `pending`
      // (cron só processa pending), portanto o pagamento nunca foi identificado.
      if (email) {
        try {
          await sendOrderCancelledEmail({
            to: email,
            orderNumber: String(order.order_number),
            customerName: name ?? "Cliente",
            total: Number(order.total),
            reason:
              order.payment_method === "pix"
                ? "PIX não pago dentro do prazo de 1 hora"
                : order.payment_method === "boleto"
                  ? "Boleto não pago dentro do prazo de 5 dias"
                  : "Pagamento não identificado dentro do prazo",
            wasAlreadyPaid: false,
          });
          results.emailsSent++;
        } catch (emailErr) {
          const msg = emailErr instanceof Error ? emailErr.message : String(emailErr);
          console.error(
            `[cron/cancel-expired] Falha ao enviar email do pedido ${order.order_number}:`,
            msg
          );
          results.emailsFailed++;
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`order ${order.order_number}: ${msg}`);
      console.error(
        `[cron/cancel-expired] Erro no pedido ${order.order_number}:`,
        msg
      );
    }
  }

  const finishedAt = new Date().toISOString();
  console.log("[cron/cancel-expired] Resultado:", JSON.stringify(results));

  return NextResponse.json({
    checked: pendingOrders.length,
    ...results,
    startedAt,
    finishedAt,
  });
}
