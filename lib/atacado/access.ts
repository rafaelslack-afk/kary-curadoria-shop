// Acesso à área de atacado por link secreto. Server-only.
//
// /atacado/[token] grava o token num cookie httpOnly de 30 dias. Toda página
// /atacado/** e a API de pedidos conferem se o cookie bate com o
// atacado_token atual: gerar um token novo no admin derruba links e cookies
// antigos. O romaneio tem acesso próprio (romaneio_token) e não usa isto.
import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAtacadoConfig, type AtacadoConfig } from "@/lib/atacado/config";

export const ATACADO_COOKIE = "kvo_atacado";
export const ATACADO_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 dias

export function tokensIguais(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Lê a configuração e diz se o cookie desta requisição dá acesso. */
export async function checkAtacadoAccess(): Promise<{ ok: boolean; config: AtacadoConfig }> {
  const config = await getAtacadoConfig();
  const cookie = cookies().get(ATACADO_COOKIE)?.value;
  return { ok: tokensIguais(cookie, config.token), config };
}
