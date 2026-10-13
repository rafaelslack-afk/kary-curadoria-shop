import { createAdminClient } from "@/lib/supabase/admin";
import { catalogItemId } from "@/lib/meta-catalog";
import { hashIdentity } from "./hash";
import { purchaseEventId, tiktokProperties, type TikTokProperties, type TrackingItem } from "./contents";

// TikTok Events API 2.0 — POST /open_api/v1.3/event/track/
//
// - Token só no servidor (TIKTOK_EVENTS_API_TOKEN); nunca NEXT_PUBLIC.
// - event_source "web", event_source_id = Pixel ID (o mesmo do navegador).
// - Timeout + 1 nova tentativa; NUNCA lança: falha no TikTok não pode afetar
//   pedido, pagamento nem webhook. Quem chama ainda envolve em try/catch e
//   agenda com waitUntil para não segurar a resposta.

const ENDPOINT = "https://business-api.tiktok.com/open_api/v1.3/event/track/";
const TIMEOUT_MS = 4000;
const MAX_ATTEMPTS = 2;

export interface TikTokUser {
  email?: string;        // sha256
  phone?: string;        // sha256 (E.164)
  external_id?: string;  // sha256
  ttclid?: string;
  ttp?: string;          // cookie _ttp
  ip?: string;
  user_agent?: string;
}

export interface TikTokServerEvent {
  event: string;
  event_id: string;
  event_time: number; // unix, segundos
  user: TikTokUser;
  properties: TikTokProperties;
  page?: { url?: string; referrer?: string };
}

// Contexto do navegador guardado no pedido (orders.tracking_context), porque
// o webhook do Mercado Pago não tem IP / user agent / cookies da cliente.
// `pii: true` marca o que ainda precisa ser apagado (ver purgeTrackingContext).
export interface OrderTrackingContext {
  pii?: true;
  ip?: string;
  user_agent?: string;
  ttp?: string;
  ttclid?: string;
  page_url?: string;
  tiktok_purchase_sent_at?: string;
}

function config() {
  const token = process.env.TIKTOK_EVENTS_API_TOKEN;
  const pixelId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;
  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE || undefined;
  return { token, pixelId, testEventCode };
}

// Aviso explícito no log quando a variável sumiu do ambiente (ex.: redeploy
// sem as envs). Não quebra nada: o evento é só descartado.
export function tiktokConfigMissing(): string[] {
  const { token, pixelId } = config();
  const missing: string[] = [];
  if (!token) missing.push("TIKTOK_EVENTS_API_TOKEN");
  if (!pixelId) missing.push("NEXT_PUBLIC_TIKTOK_PIXEL_ID");
  return missing;
}

function clean<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ) as T;
}

export async function sendTikTokEvents(events: TikTokServerEvent[]): Promise<boolean> {
  try {
    const missing = tiktokConfigMissing();
    if (missing.length > 0) {
      console.warn(
        `[TikTok Events API] AVISO: variável(is) ausente(s) no ambiente: ${missing.join(", ")}. ` +
          `Evento(s) ${events.map((e) => e.event).join(", ")} NÃO enviado(s). ` +
          `Cadastre na Vercel (Production e Preview) e faça redeploy.`
      );
      return false;
    }
    const { token, pixelId, testEventCode } = config();

    const body = clean({
      event_source: "web",
      event_source_id: pixelId,
      test_event_code: testEventCode,
      data: events.map((e) =>
        clean({
          event: e.event,
          event_time: e.event_time,
          event_id: e.event_id,
          user: clean(e.user),
          properties: e.properties,
          page: e.page ? clean(e.page) : undefined,
        })
      ),
    });

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const res = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Access-Token": token! },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as
          | { code?: number; message?: string; request_id?: string }
          | null;

        if (res.ok && json?.code === 0) return true;

        const summary =
          `status=${res.status} code=${json?.code ?? "none"} ` +
          `message="${String(json?.message ?? "").slice(0, 300)}" request_id=${json?.request_id ?? "none"}`;
        // 4xx (exceto 429) = payload/token inválido: repetir não resolve
        const retryable = res.status === 429 || res.status >= 500;
        console.error(
          `[TikTok Events API] falha (tentativa ${attempt}/${MAX_ATTEMPTS}) ` +
            `eventos=${events.map((e) => `${e.event}:${e.event_id}`).join(",")} ${summary}`
        );
        if (!retryable) return false;
      } catch (err) {
        console.error(
          `[TikTok Events API] erro de rede/timeout (tentativa ${attempt}/${MAX_ATTEMPTS}):`,
          err instanceof Error ? `${err.name}: ${err.message}` : err
        );
      }
      if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  } catch (err) {
    console.error("[TikTok Events API] erro inesperado:", err);
    return false;
  }
}

// ── Contexto da requisição (IP, user agent, cookies) ─────────────────────────

export function clientIp(headers: Headers): string | undefined {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    undefined
  );
}

function readCookie(headers: Headers, name: string): string | undefined {
  const raw = headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) {
      try {
        return decodeURIComponent(v.join("=")) || undefined;
      } catch {
        return v.join("=") || undefined;
      }
    }
  }
  return undefined;
}

export function requestTrackingContext(headers: Headers): OrderTrackingContext {
  return clean({
    pii: true as const,
    ip: clientIp(headers),
    user_agent: headers.get("user-agent")?.slice(0, 500) || undefined,
    ttp: readCookie(headers, "_ttp")?.slice(0, 200),
    ttclid: readCookie(headers, "ttclid")?.slice(0, 500),
    page_url: headers.get("referer")?.slice(0, 1000) || undefined,
  });
}

// ── Compra (Purchase) confirmada ─────────────────────────────────────────────

// Grava o contexto do navegador no pedido. Separado do insert do pedido:
// se a coluna ainda não existir (migration pendente) ou o update falhar, o
// pedido segue normalmente — só a compra perde IP/UA/_ttp/ttclid no TikTok.
export async function saveOrderTrackingContext(orderId: string, ctx: OrderTrackingContext) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("orders").update({ tracking_context: ctx }).eq("id", orderId);
    if (error) console.error("[TikTok] falha ao salvar tracking_context do pedido:", orderId, error.message);
  } catch (err) {
    console.error("[TikTok] erro ao salvar tracking_context do pedido:", orderId, err);
  }
}

interface PurchaseOrderRow {
  id: string;
  order_number: number;
  total: number;
  guest_email: string | null;
  customer_phone: string | null;
  tracking_context: OrderTrackingContext | null;
  order_items: {
    product_name: string;
    color_snapshot: string | null;
    sku_snapshot: string | null;
    quantity: number;
    unit_price: number;
    products: { sku_base: string | null } | { sku_base: string | null }[] | null;
  }[];
}

// Itens do pedido com o g:id do catálogo (produto + cor), somando tamanhos.
function orderItems(order: PurchaseOrderRow): TrackingItem[] {
  const byId = new Map<string, TrackingItem>();
  for (const item of order.order_items ?? []) {
    const product = Array.isArray(item.products) ? item.products[0] : item.products;
    const id = product?.sku_base
      ? catalogItemId(product.sku_base, item.color_snapshot)
      : item.sku_snapshot ?? item.product_name;
    const current = byId.get(id);
    if (current) current.quantity += item.quantity;
    else byId.set(id, { id, name: item.product_name, price: Number(item.unit_price), quantity: item.quantity });
  }
  return Array.from(byId.values());
}

// Envia o Purchase do servidor para um pedido PAGO. Idempotente (marca
// tiktok_purchase_sent_at) e, após sucesso, apaga IP / user agent / _ttp /
// ttclid do pedido. Nunca lança.
export async function sendOrderPurchase(orderId: string): Promise<void> {
  try {
    const admin = createAdminClient();
    const fields =
      "id, order_number, total, guest_email, customer_phone, " +
      "order_items(product_name, color_snapshot, sku_snapshot, quantity, unit_price, products(sku_base))";
    let { data, error } = await admin
      .from("orders")
      .select(`${fields}, tracking_context`)
      .eq("id", orderId)
      .single();
    if (error && /tracking_context/.test(error.message)) {
      // Migration add_orders_tracking_context.sql ainda não aplicada
      console.warn("[TikTok Purchase] coluna orders.tracking_context ausente — enviando sem IP/UA/_ttp/ttclid.");
      ({ data, error } = await admin.from("orders").select(fields).eq("id", orderId).single());
    }

    if (error || !data) {
      console.error("[TikTok Purchase] pedido não carregado:", orderId, error?.message);
      return;
    }
    const order = data as unknown as PurchaseOrderRow;
    const ctx = order.tracking_context ?? {};
    if (ctx.tiktok_purchase_sent_at) return; // já enviado

    const identity = await hashIdentity(order.guest_email, order.customer_phone);
    const ok = await sendTikTokEvents([
      {
        event: "Purchase",
        event_id: purchaseEventId(order.id),
        event_time: Math.floor(Date.now() / 1000),
        user: {
          ...identity,
          ttclid: ctx.ttclid,
          ttp: ctx.ttp,
          ip: ctx.ip,
          user_agent: ctx.user_agent,
        },
        properties: tiktokProperties(orderItems(order), order.total, String(order.order_number)),
        page: { url: ctx.page_url },
      },
    ]);

    if (!ok) return; // dados ficam até o envio dar certo ou a limpeza de 7 dias

    // Retenção: depois do envio, o pedido guarda só a marca de envio.
    const { error: updErr } = await admin
      .from("orders")
      .update({ tracking_context: { tiktok_purchase_sent_at: new Date().toISOString() } })
      .eq("id", order.id);
    if (updErr) console.error("[TikTok Purchase] falha ao limpar tracking_context:", order.id, updErr.message);
    else console.log(`[TikTok Purchase] pedido #${order.order_number} enviado.`);
  } catch (err) {
    console.error("[TikTok Purchase] erro inesperado:", orderId, err);
  }
}

// Limpeza (cron): apaga IP / user agent / _ttp / ttclid de pedidos com mais de
// 7 dias que ainda os guardam — nunca pagos, ou cujo envio nunca deu certo.
export async function purgeTrackingContext(): Promise<number> {
  try {
    const admin = createAdminClient();
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("orders")
      .update({ tracking_context: null })
      .lt("created_at", cutoff)
      .eq("tracking_context->>pii", "true")
      .select("id");
    if (error) {
      console.error("[TikTok] falha na limpeza do tracking_context:", error.message);
      return 0;
    }
    return data?.length ?? 0;
  } catch (err) {
    console.error("[TikTok] erro na limpeza do tracking_context:", err);
    return 0;
  }
}
