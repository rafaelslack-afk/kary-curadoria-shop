import { NextRequest, NextResponse } from "next/server";
import { ATACADO_COOKIE, ATACADO_COOKIE_MAX_AGE, tokensIguais } from "@/lib/atacado/access";
import { getAtacadoConfig } from "@/lib/atacado/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /atacado/[token] — link secreto do atacado. Token certo → cookie
// httpOnly de 30 dias e catálogo. Token errado/antigo → /atacado, que mostra
// a página de link expirado (e o cookie antigo, se houver, é removido).
export async function GET(request: NextRequest, { params }: { params: { token: string } }) {
  const config = await getAtacadoConfig();
  const response = NextResponse.redirect(new URL("/atacado", request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");

  if (tokensIguais(params.token, config.token)) {
    response.cookies.set(ATACADO_COOKIE, params.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ATACADO_COOKIE_MAX_AGE,
    });
  } else {
    response.cookies.delete(ATACADO_COOKIE);
  }
  return response;
}
