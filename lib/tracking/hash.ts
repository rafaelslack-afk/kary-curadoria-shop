// Normalização + SHA-256 de dados pessoais para o TikTok (Pixel e Events API).
//
// Roda no navegador e no servidor: os dois têm WebCrypto (crypto.subtle).
// Regras do TikTok: só SHA-256, em hexadecimal minúsculo; e-mail com trim +
// lowercase; telefone em E.164 (+55…); external_id com trim.

export function normalizeEmail(email: string | null | undefined): string | null {
  const value = (email ?? "").trim().toLowerCase();
  return value.includes("@") ? value : null;
}

// "(11) 99999-8888" → "+5511999998888". Aceita número já com 55 na frente.
// Retorna null para qualquer coisa que não pareça um telefone brasileiro.
export function normalizePhoneBR(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  if (digits.length !== 10 && digits.length !== 11) return null;
  return `+55${digits}`;
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const SHA256_HEX = /^[a-f0-9]{64}$/;

export interface HashedIdentity {
  email?: string;        // sha256(e-mail normalizado)
  phone?: string;        // sha256(telefone E.164)
  external_id?: string;  // sha256(e-mail normalizado) — decisão do projeto
}

// external_id = SHA-256 do e-mail normalizado, para todos os pedidos (com ou
// sem customer_id). CPF nunca é usado.
export async function hashIdentity(
  email: string | null | undefined,
  phone: string | null | undefined
): Promise<HashedIdentity> {
  const identity: HashedIdentity = {};
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhoneBR(phone);
  if (normalizedEmail) {
    identity.email = await sha256Hex(normalizedEmail);
    identity.external_id = identity.email;
  }
  if (normalizedPhone) identity.phone = await sha256Hex(normalizedPhone);
  return identity;
}
