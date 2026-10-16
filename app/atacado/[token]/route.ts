import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /atacado/[token] — links antigos do atacado (da época do link secreto).
// O catálogo agora fica em endereço fixo e aberto (/atacado): qualquer token
// redireciona para lá (308), para os links já enviados às lojistas seguirem
// funcionando. O cookie de acesso antigo, se houver, é removido.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/atacado", request.url), 308);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.cookies.delete("kvo_atacado");
  return response;
}
