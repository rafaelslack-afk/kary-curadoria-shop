// ── Convite TikTok Shop ──────────────────────────────────────────────────────
// Funções puras (sem servidor): usadas no site, no admin e nas rotas de API.
// Configuração em system_config, chave "tiktok_shop":
//   { "ativo": true, "url_perfil": "https://www.tiktok.com/@karycuradoria",
//     "texto": "Prefere comprar pelo TikTok? Também estamos na TikTok Shop." }

export const TIKTOK_SHOP_CONFIG_KEY = "tiktok_shop";
export const TIKTOK_SHOP_TEXT_MAX = 120;

export interface TikTokShopConfig {
  ativo: boolean;
  url_perfil: string;
  texto: string;
}

export const TIKTOK_SHOP_DEFAULT: TikTokShopConfig = {
  ativo: true,
  url_perfil: "https://www.tiktok.com/@karycuradoria",
  texto: "Prefere comprar pelo TikTok? Também estamos na TikTok Shop.",
};

/**
 * Valida e normaliza um link do TikTok. Aceita só https:// em tiktok.com ou
 * subdomínio (www., shop., vm., vt. ...). Esquemas de app (snssdk://) e
 * outros domínios são recusados. Retorna a URL normalizada ou null.
 */
export function normalizeTikTokUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  if (host !== "tiktok.com" && !host.endsWith(".tiktok.com")) return null;
  if (u.username || u.password) return null;
  u.protocol = "https:";
  return u.toString();
}

/** Lê o valor gravado em system_config. Valor ausente ou inválido → padrão. */
export function parseTikTokShopConfig(raw: unknown): TikTokShopConfig {
  let v: unknown = raw;
  if (typeof raw === "string") {
    try {
      v = JSON.parse(raw);
    } catch {
      v = null;
    }
  }
  if (!v || typeof v !== "object") return { ...TIKTOK_SHOP_DEFAULT };
  const o = v as Record<string, unknown>;
  const url = normalizeTikTokUrl(o.url_perfil) ?? TIKTOK_SHOP_DEFAULT.url_perfil;
  const texto =
    typeof o.texto === "string" && o.texto.trim()
      ? o.texto.trim().slice(0, TIKTOK_SHOP_TEXT_MAX)
      : TIKTOK_SHOP_DEFAULT.texto;
  return { ativo: o.ativo !== false, url_perfil: url, texto };
}

/** O convite nunca aparece nestes caminhos. */
export function isTikTokShopHiddenPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return ["/checkout", "/carrinho", "/atacado", "/admin"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
