// Camada única de eventos de conversão no navegador: Meta Pixel + TikTok
// Pixel + TikTok Events API (via /api/tracking/tiktok), a partir da mesma
// chamada e com o MESMO event_id no navegador e no servidor (deduplicação).
//
// O Meta continua recebendo exatamente os parâmetros de antes (pixelEvent);
// só o Purchase leva eventID, preparando a futura Conversions API.
//
// O Purchase NÃO passa pela rota do servidor: o lado server da compra é
// disparado pela confirmação real do pagamento (webhook / cartão aprovado).

import { pixelEvent } from "@/lib/pixel";
import { hasAdConsent } from "./consent";
import { hashIdentity, type HashedIdentity } from "./hash";
import type { TikTokProperties } from "./contents";

export type ServerTrackedEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo";
export type ConversionEvent = ServerTrackedEvent | "Purchase";

export const SERVER_TRACKED_EVENTS: readonly ServerTrackedEvent[] = [
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
];

interface TikTokQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (...args: any[]): void;
  page: () => void;
  track: (event: string, properties?: object, options?: { event_id?: string }) => void;
  identify: (data: { email?: string; phone_number?: string; external_id?: string }) => void;
  holdConsent: () => void;
  grantConsent: () => void;
  revokeConsent: () => void;
}

declare global {
  interface Window {
    ttq?: TikTokQueue;
  }
}

// Corpo aceito por /api/tracking/tiktok
export interface TikTokServerEventBody {
  event: ServerTrackedEvent;
  event_id: string;
  event_time: number;
  properties: TikTokProperties;
  user?: HashedIdentity;
  page?: { url?: string; referrer?: string };
}

export const IDENTITY_STORAGE_KEY = "kvo-tt-identity";

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function storedIdentity(): HashedIdentity | undefined {
  try {
    const raw = window.sessionStorage.getItem(IDENTITY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HashedIdentity) : undefined;
  } catch {
    return undefined;
  }
}

function sendIdentify(identity: HashedIdentity) {
  window.ttq?.identify({
    email: identity.email,
    phone_number: identity.phone,
    external_id: identity.external_id,
  });
}

// Cliente identificada (checkout, etapa 1): e-mail, telefone e external_id
// com SHA-256, guardados na sessão para os próximos eventos e páginas.
export async function identifyCustomer(email: string, phone: string) {
  try {
    const identity = await hashIdentity(email, phone);
    if (!identity.email && !identity.phone) return;
    window.sessionStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity));
    sendIdentify(identity);
  } catch { /* tracking nunca bloqueia o checkout */ }
}

function sendToServer(body: TikTokServerEventBody) {
  try {
    fetch("/api/tracking/tiktok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true, // sobrevive à navegação (ex.: AddPaymentInfo → página do PIX)
    }).catch(() => {});
  } catch { /* nunca propaga */ }
}

interface ConversionInput {
  tiktok: TikTokProperties;
  // Parâmetros do Meta Pixel, idênticos aos de antes. Ausente = não envia ao Meta.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: Record<string, any>;
  // event_id fixo (Purchase); nos demais é gerado aqui.
  eventId?: string;
}

export function trackConversion(event: ConversionEvent, input: ConversionInput): string {
  const eventId = input.eventId ?? `${event}_${randomId()}`;
  if (typeof window === "undefined") return eventId;

  try {
    if (input.meta) {
      pixelEvent(event, input.meta, event === "Purchase" ? { eventID: eventId } : undefined);
    }

    window.ttq?.track(event, input.tiktok, { event_id: eventId });

    if (event !== "Purchase" && hasAdConsent()) {
      sendToServer({
        event,
        event_id: eventId,
        event_time: Math.floor(Date.now() / 1000),
        properties: input.tiktok,
        user: storedIdentity(),
        page: { url: window.location.href, referrer: document.referrer || undefined },
      });
    }
  } catch (err) {
    console.warn("[tracking] falha ao registrar evento", event, err);
  }
  return eventId;
}
