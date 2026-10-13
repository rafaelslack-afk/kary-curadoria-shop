import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { SHA256_HEX } from "@/lib/tracking/hash";
import { SERVER_TRACKED_EVENTS, type TikTokServerEventBody } from "@/lib/tracking/events";
import {
  requestTrackingContext,
  sendTikTokEvents,
  tiktokConfigMissing,
  clientIp,
} from "@/lib/tracking/tiktok-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lado servidor (Events API) de ViewContent, AddToCart, InitiateCheckout e
// AddPaymentInfo, com o mesmo event_id do Pixel. O Purchase NÃO é aceito
// aqui: vem só da confirmação real do pagamento (webhook / cartão aprovado).
//
// Proteções: Origin/Referer da loja, 60 req/min por IP, só os 4 eventos,
// payload validado. Responde 204 sem esperar o TikTok (waitUntil).

const ALLOWED_HOSTS = new Set(["karycuradoria.com.br", "www.karycuradoria.com.br"]);

function allowedHost(host: string): boolean {
  if (ALLOWED_HOSTS.has(host)) return true;
  // O próprio deployment (preview da Vercel), para validar antes da produção
  if (process.env.VERCEL_URL && host === process.env.VERCEL_URL) return true;
  if (process.env.VERCEL_BRANCH_URL && host === process.env.VERCEL_BRANCH_URL) return true;
  if (process.env.NODE_ENV !== "production" && (host.startsWith("localhost:") || host === "localhost")) return true;
  return false;
}

function hostOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function originAllowed(request: NextRequest): boolean {
  const host = hostOf(request.headers.get("origin")) ?? hostOf(request.headers.get("referer"));
  return host !== null && allowedHost(host);
}

// Limite por IP: 60 req/min, janela fixa, em memória. Vale por instância da
// função (na Vercel há poucas instâncias quentes); é uma barreira contra
// abuso simples, não um limite global exato.
const RATE_LIMIT = 60;
const WINDOW_MS = 60_000;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (v.resetAt <= now) hits.delete(k);
    });
  }
  const entry = hits.get(ip);
  if (!entry || entry.resetAt <= now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

const str = (v: unknown, max: number) =>
  typeof v === "string" && v.length > 0 ? v.slice(0, max) : undefined;
const hash = (v: unknown) => (typeof v === "string" && SHA256_HEX.test(v) ? v : undefined);

function parseBody(raw: unknown): TikTokServerEventBody | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (!SERVER_TRACKED_EVENTS.includes(b.event as never)) return null;

  const eventId = str(b.event_id, 120);
  if (!eventId) return null;

  const p = b.properties as Record<string, unknown> | undefined;
  if (!p || !Array.isArray(p.contents) || p.contents.length > 100) return null;
  const value = Number(p.value);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) return null;

  const contents = (p.contents as Record<string, unknown>[]).flatMap((c) => {
    const id = str(c?.content_id, 120);
    if (!id) return [];
    return [{
      content_id: id,
      content_type: "product" as const,
      content_name: str(c.content_name, 200) ?? "",
      price: Number(c.price) || 0,
      quantity: Math.max(1, Math.floor(Number(c.quantity) || 1)),
    }];
  });

  // event_time do navegador, aceito só se plausível (±1h); senão, agora.
  const now = Math.floor(Date.now() / 1000);
  const t = Number(b.event_time);
  const eventTime = Number.isFinite(t) && Math.abs(now - t) < 3600 ? Math.floor(t) : now;

  const u = (b.user ?? {}) as Record<string, unknown>;
  const pg = (b.page ?? {}) as Record<string, unknown>;

  return {
    event: b.event as TikTokServerEventBody["event"],
    event_id: eventId,
    event_time: eventTime,
    properties: { currency: "BRL", value, content_type: "product", contents },
    user: { email: hash(u.email), phone: hash(u.phone), external_id: hash(u.external_id) },
    page: { url: str(pg.url, 1000), referrer: str(pg.referrer, 1000) },
  };
}

export async function POST(request: NextRequest) {
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ip = clientIp(request.headers) ?? "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: TikTokServerEventBody | null = null;
  try {
    body = parseBody(await request.json());
  } catch {
    body = null;
  }
  if (!body) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const missing = tiktokConfigMissing();
  if (missing.length > 0) {
    // sendTikTokEvents registra o aviso detalhado; nada a enviar.
    console.warn(`[api/tracking/tiktok] AVISO: ${missing.join(", ")} ausente(s) — evento ${body.event} descartado. Cadastre na Vercel e faça redeploy.`);
    return new NextResponse(null, { status: 204 });
  }

  const ctx = requestTrackingContext(request.headers);
  const event = {
    event: body.event,
    event_id: body.event_id,
    event_time: body.event_time,
    user: {
      ...body.user,
      ttclid: ctx.ttclid,
      ttp: ctx.ttp,
      ip: ctx.ip,
      user_agent: ctx.user_agent,
    },
    properties: body.properties,
    page: body.page,
  };

  waitUntil(sendTikTokEvents([event]).then(() => undefined));
  return new NextResponse(null, { status: 204 });
}
