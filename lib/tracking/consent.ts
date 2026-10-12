// Consentimento de cookies de publicidade (Meta Pixel + TikTok Pixel).
//
// Hoje a loja não tem banner: o consentimento é tratado como CONCEDIDO, o
// mesmo comportamento que o Meta Pixel sempre teve. O banner LGPD (tarefa
// separada) só precisa chamar setConsent("granted" | "denied"); se ele passar
// a exigir aceite prévio, trocar DEFAULT_CONSENT para "pending" faz o TikTok
// carregar em holdConsent até a escolha.

export type ConsentState = "granted" | "denied" | "pending";

export const DEFAULT_CONSENT: ConsentState = "granted";

export const CONSENT_STORAGE_KEY = "kvo-ad-consent";

export function getConsent(): ConsentState {
  if (typeof window === "undefined") return DEFAULT_CONSENT;
  try {
    const saved = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (saved === "granted" || saved === "denied") return saved;
  } catch { /* storage bloqueado */ }
  return DEFAULT_CONSENT;
}

// O estado inicial é aplicado no snippet do TikTok (components/analytics/
// tiktok-pixel.tsx), antes do primeiro ttq.page(). Concedido = nenhuma
// chamada extra (comportamento atual dos dois pixels).

// Aplica um estado nos pixels já carregados (banner / preferências).
export function applyConsent(state: ConsentState) {
  if (typeof window === "undefined") return;
  const { ttq, fbq } = window;
  if (state === "granted") {
    ttq?.grantConsent?.();
    fbq?.("consent", "grant");
  } else if (state === "denied") {
    ttq?.revokeConsent?.();
    fbq?.("consent", "revoke");
  } else {
    ttq?.holdConsent?.();
  }
}

export function setConsent(state: "granted" | "denied") {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, state);
  } catch { /* storage bloqueado */ }
  applyConsent(state);
}

export function hasAdConsent(): boolean {
  return getConsent() === "granted";
}
