import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isStorePrelaunchActive } from "@/lib/store-launch";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Rotas de API admin não passam pelo middleware de auth
  // (protegidas pelo service role key no server)
  const pathname = request.nextUrl.pathname;

  if (
    isStorePrelaunchActive() &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Protect /admin routes (except /admin/login)
  if (!pathname.startsWith("/admin")) {
    return response;
  }

  // Tentar obter a sessão — se o Supabase estiver acordando (504/timeout),
  // não bloquear o acesso: deixar a página carregar e o erro aparecer lá.
  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch (err) {
    // Supabase indisponível (504 enquanto acorda) — não redirecionar
    console.warn("[middleware] Supabase auth indisponível:", (err as Error).message ?? err);
    return response;
  }

  if (pathname === "/admin/login") {
    // Já logado → vai para o dashboard
    if (session) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return response;
  }

  // Rota protegida sem sessão → login
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
