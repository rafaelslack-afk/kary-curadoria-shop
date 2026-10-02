import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Sessão do admin, no padrão oficial do @supabase/ssr para Next.js.
//
// Roda SÓ em /admin (ver matcher): a loja pública e as APIs não consultam o
// Auth. As rotas /api/admin continuam protegidas por requireAdmin().
//
// Uma validação de sessão por requisição (getUser). Se o token de acesso
// estiver vencido, o @supabase/ssr renova uma vez e os cookies novos voltam
// na resposta (setAll) — inclusive em redirects —, para a próxima requisição
// não renovar de novo. Antes, cada cookie da sessão recriava a resposta e só
// o último chegava ao navegador, então a sessão nunca era salva e toda
// requisição renovava o token outra vez.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Na request (para o restante desta requisição) E na response
          // (para o navegador), todos de uma vez.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Não colocar código entre createServerClient e getUser.
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  // Auth fora do ar (5xx/timeout): não redireciona para o login em loop. A
  // página abre e as chamadas a /api/admin respondem 401 via requireAdmin.
  if (!user && error && (error.status ?? 0) >= 500) {
    console.warn("[middleware] Supabase Auth indisponível:", error.status);
    return response;
  }

  const pathname = request.nextUrl.pathname;

  // Redirect levando os cookies renovados nesta requisição
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url));
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (pathname === "/admin/login") {
    return user ? redirectTo("/admin") : response;
  }

  return user ? response : redirectTo("/admin/login");
}

export const config = {
  // Área da cliente (/conta) ainda não existe; quando existir, incluir aqui.
  matcher: ["/admin", "/admin/:path*"],
};
