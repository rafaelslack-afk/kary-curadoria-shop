import { createAdminClient } from "@/lib/supabase/admin";

// ── Notificação ERP — nova venda online ───────────────────────────────────────
// Único ponto que envia a venda ao ERP (POST {ERP_BASE_URL}/api/kvo/sale →
// kvo_pending_sales). Chamado por todos os caminhos em que o pedido fica pago:
//   - /api/orders/create         (cartão aprovado na criação)
//   - /api/webhooks/mercadopago  (PIX, boleto, cartão em análise)
//   - PUT /api/orders/[id]       (admin marca como pago)
//   - POST /api/admin/orders/[id]/erp-resend (botão "Reenviar ao ERP")
//
// Garantias:
//   - Idempotente: só envia se orders.erp_notified_at for NULL. Uma trava curta
//     (erp_notify_started_at, 60 s) impede que dois caminhos enviem o mesmo
//     pedido ao mesmo tempo (ex.: orders/create e webhook do cartão aprovado).
//   - Até 3 tentativas, 5 s de timeout cada, esperas de 1 s e 3 s
//     (pior caso ≈ 19 s, abaixo do maxDuration de 30 s das rotas).
//   - Nunca lança: erros ficam em orders.erp_last_error e no log "[ERP Sale]".
//   - Quem chama dentro de uma rota deve usar waitUntil(notifyErpNewSale(...))
//     ou await, para a Vercel não encerrar a função antes do fim do envio.

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 5000;
const BACKOFF_MS = [1000, 3000];
const LOCK_TTL_MS = 60_000;

export const ERP_PAID_STATUSES = ["paid", "preparing", "shipped", "delivered"] as const;

export type ErpNotifyStatus =
  | "sent"              // ERP respondeu 2xx
  | "already_notified"  // erp_notified_at já preenchido
  | "in_progress"       // outro caminho está enviando agora
  | "skipped"           // todos os itens com notifica_erp_venda=false
  | "not_paid"          // pedido não está em status pago
  | "not_found"
  | "not_configured"    // ERP_BASE_URL / ERP_WEBHOOK_SECRET ausentes
  | "failed";           // esgotou as tentativas

export interface ErpNotifyResult {
  status: ErpNotifyStatus;
  attempts?: number;
  error?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function notifyErpNewSale(orderId: string, source: string): Promise<ErpNotifyResult> {
  try {
    return await notifyInner(orderId, source);
  } catch (err) {
    console.error(`[ERP Sale] (${source}) Erro inesperado no pedido ${orderId}:`, err);
    return { status: "failed", error: String(err) };
  }
}

async function notifyInner(orderId: string, source: string): Promise<ErpNotifyResult> {
  const admin = createAdminClient();
  const erpUrl = process.env.ERP_BASE_URL;
  const erpSecret = process.env.ERP_WEBHOOK_SECRET;

  if (!erpUrl || !erpSecret) {
    const msg = "ERP_BASE_URL ou ERP_WEBHOOK_SECRET não configurados";
    console.error(`[ERP Sale] (${source}) ${msg} — pedido ${orderId} não notificado.`);
    await admin.from("orders").update({ erp_last_error: msg }).eq("id", orderId).is("erp_notified_at", null);
    return { status: "not_configured", error: msg };
  }

  // 1. Trava: só um envio por pedido por vez, e nunca depois de notificado.
  const now = new Date();
  const staleBefore = new Date(now.getTime() - LOCK_TTL_MS).toISOString();
  const { data: claimed, error: claimErr } = await admin
    .from("orders")
    .update({ erp_notify_started_at: now.toISOString() })
    .eq("id", orderId)
    .is("erp_notified_at", null)
    .in("status", ERP_PAID_STATUSES as unknown as string[])
    .or(`erp_notify_started_at.is.null,erp_notify_started_at.lt.${staleBefore}`)
    .select("id");

  if (claimErr) {
    console.error(`[ERP Sale] (${source}) Falha ao travar pedido ${orderId}:`, claimErr.message);
    return { status: "failed", error: claimErr.message };
  }

  if (!claimed || claimed.length === 0) {
    const { data: cur } = await admin
      .from("orders")
      .select("order_number, status, erp_notified_at")
      .eq("id", orderId)
      .maybeSingle();
    if (!cur) return { status: "not_found" };
    if (cur.erp_notified_at) {
      console.log(`[ERP Sale] (${source}) Pedido #${cur.order_number} já notificado — nada a fazer.`);
      return { status: "already_notified" };
    }
    if (!(ERP_PAID_STATUSES as readonly string[]).includes(cur.status)) {
      return { status: "not_paid" };
    }
    console.log(`[ERP Sale] (${source}) Pedido #${cur.order_number} com envio em andamento — ignorado.`);
    return { status: "in_progress" };
  }

  // 2. Dados do pedido e itens.
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, order_number, guest_name, guest_email, customer_phone, subtotal, shipping_cost, discount, total, payment_method, shipping_service, erp_notify_attempts")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) {
    await releaseLock(orderId, `Falha ao ler pedido: ${orderErr?.message ?? "não encontrado"}`, 0, 0);
    return { status: "failed", error: orderErr?.message ?? "pedido não encontrado" };
  }

  const prevAttempts = order.erp_notify_attempts ?? 0;

  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select(`
      product_name,
      size_snapshot,
      sku_snapshot,
      quantity,
      unit_price,
      products ( sku_base, notifica_erp_venda, erp_sync_enabled ),
      product_variants ( color )
    `)
    .eq("order_id", order.id);

  if (itemsErr) {
    await releaseLock(orderId, `Falha ao ler itens: ${itemsErr.message}`, prevAttempts, 0);
    return { status: "failed", error: itemsErr.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const one = (v: any) => (Array.isArray(v) ? v[0] : v);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deveNotificar = (items ?? []).some((item: any) => one(item.products)?.notifica_erp_venda !== false);

  if (!deveNotificar) {
    console.log(`[ERP Sale] (${source}) Pedido #${order.order_number} — todos os itens com notifica_erp_venda=false, pulando notificação.`);
    await admin
      .from("orders")
      .update({
        erp_notified_at: new Date().toISOString(),
        erp_notify_started_at: null,
        erp_last_error: "Ignorado: todos os itens com notifica_erp_venda=false",
      })
      .eq("id", orderId);
    return { status: "skipped" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mappedItems = (items ?? []).map((item: any) => {
    const prod = one(item.products);
    const variant = one(item.product_variants);
    return {
      product_code: prod?.sku_base ?? null,
      product_name: item.product_name,
      color: variant?.color ?? null,
      size: item.size_snapshot,
      sku: item.sku_snapshot,
      quantity: item.quantity,
      unit_price: item.unit_price,
      // Flag para o ERP: itens sem sync de estoque são "sob encomenda"
      is_encomenda: prod?.erp_sync_enabled === false,
    };
  });

  const payload = {
    order_id: order.id,
    order_number: order.order_number,
    customer_name: order.guest_name ?? null,
    customer_phone: order.customer_phone ?? null,
    customer_email: order.guest_email ?? null,
    has_encomenda_items: mappedItems.some((i) => i.is_encomenda),
    items: mappedItems,
    subtotal: order.subtotal,
    shipping_cost: order.shipping_cost,
    discount: order.discount ?? 0,
    total: order.total,
    payment_method: order.payment_method,
    shipping_service: order.shipping_service,
    origin: "kvo_online",
  };

  // 3. Envio com até 3 tentativas.
  let lastError = "";
  let attempt = 0;
  for (attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${erpUrl}/api/kvo/sale`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${erpSecret}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (res.ok) {
        await admin
          .from("orders")
          .update({
            erp_notified_at: new Date().toISOString(),
            erp_notify_started_at: null,
            erp_notify_attempts: prevAttempts + attempt,
            erp_last_error: null,
          })
          .eq("id", orderId);
        console.log(`[ERP Sale] (${source}) Pedido #${order.order_number} notificado com sucesso (tentativa ${attempt}).`);
        return { status: "sent", attempts: attempt };
      }

      const text = await res.text().catch(() => "(sem corpo)");
      lastError = `HTTP ${res.status}: ${text.slice(0, 300)}`;
      console.error(`[ERP Sale] (${source}) Pedido #${order.order_number} tentativa ${attempt}/${MAX_ATTEMPTS} — ${lastError}`);

      // 4xx (exceto 408/429) não se resolve repetindo — ex.: segredo inválido.
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) break;
    } catch (err) {
      lastError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error(`[ERP Sale] (${source}) Pedido #${order.order_number} tentativa ${attempt}/${MAX_ATTEMPTS} — ${lastError}`);
    }

    if (attempt < MAX_ATTEMPTS) await sleep(BACKOFF_MS[attempt - 1] ?? 3000);
  }

  const attemptsDone = Math.min(attempt, MAX_ATTEMPTS);
  await releaseLock(orderId, lastError, prevAttempts, attemptsDone);
  console.error(`[ERP Sale] (${source}) Pedido #${order.order_number} NÃO notificado após ${attemptsDone} tentativa(s).`);
  return { status: "failed", attempts: attemptsDone, error: lastError };
}

async function releaseLock(orderId: string, error: string, prevAttempts: number, attempts: number) {
  try {
    await createAdminClient()
      .from("orders")
      .update({
        erp_notify_started_at: null,
        erp_notify_attempts: prevAttempts + attempts,
        erp_last_error: error,
      })
      .eq("id", orderId);
  } catch (err) {
    console.error(`[ERP Sale] Falha ao liberar trava do pedido ${orderId}:`, err);
  }
}
