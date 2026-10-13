import { createHmac, timingSafeEqual } from "crypto";

// Comprovante assinado de cotação de frete (quoteToken).
//
// /api/shipping/melhorenvio assina cada opção que devolve (serviço, preço,
// prazo, CEP e validade); /api/orders/create confere a assinatura para saber
// se o frete do pedido é o que o servidor cotou — sem nova chamada ao
// Melhor Envio. Vale também para o frete fixo usado quando o ME está fora.
//
// Chave: HMAC derivado de SUPABASE_SERVICE_ROLE_KEY com rótulo próprio
// (separado do rótulo do chat). Nenhuma variável de ambiente nova.
// Uso exclusivo no servidor.

const LABEL = "kvo-shipping-quote-v1";
const TTL_SECONDS = 24 * 60 * 60;

interface QuotePayload {
  v: 1;
  sid: number;   // id do serviço (option.id)
  p: number;     // preço em centavos
  d: number;     // prazo em dias
  cep: string;   // CEP de destino, só dígitos
  exp: number;   // validade (unix, segundos)
}

function signingKey(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return null;
  return createHmac("sha256", secret).update(LABEL).digest();
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function toCents(value: number): number {
  return Math.round(Number(value) * 100);
}

// Devolve null se não houver chave (a rota de frete segue respondendo sem token).
export function signShippingQuote(
  option: { id: number; preco: number; prazo: number },
  cep: string
): string | null {
  const key = signingKey();
  if (!key) return null;
  const payload: QuotePayload = {
    v: 1,
    sid: option.id,
    p: toCents(option.preco),
    d: option.prazo,
    cep: cep.replace(/\D/g, ""),
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(createHmac("sha256", key).update(body).digest());
  return `${body}.${sig}`;
}

export type QuoteCheck =
  | { ok: true; priceCents: number }
  | { ok: false; reason: string; quotedCents?: number }; // quotedCents: preço cotado, se o comprovante é autêntico

// Confere o comprovante contra o frete do pedido. Nunca lança.
export function verifyShippingQuote(
  token: unknown,
  order: { serviceId: string | number; preco: number; cep: string }
): QuoteCheck {
  try {
    if (typeof token !== "string" || !token.includes(".")) {
      return { ok: false, reason: "frete_sem_comprovante" };
    }
    const key = signingKey();
    if (!key) return { ok: false, reason: "frete_sem_chave" };

    const [body, sig] = token.split(".");
    const expected = createHmac("sha256", key).update(body).digest();
    const given = Buffer.from(sig ?? "", "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return { ok: false, reason: "frete_assinatura_invalida" };
    }

    const q = JSON.parse(Buffer.from(body, "base64url").toString()) as QuotePayload;
    if (q.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "frete_comprovante_expirado" };
    if (q.cep !== String(order.cep).replace(/\D/g, "")) return { ok: false, reason: "frete_cep_diferente" };
    if (String(q.sid) !== String(order.serviceId)) return { ok: false, reason: "frete_servico_diferente" };
    if (q.p !== toCents(order.preco)) return { ok: false, reason: "frete_preco_diferente", quotedCents: q.p };
    return { ok: true, priceCents: q.p };
  } catch {
    return { ok: false, reason: "frete_comprovante_ilegivel" };
  }
}
