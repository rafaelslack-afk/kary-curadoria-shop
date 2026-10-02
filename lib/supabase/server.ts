import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente com a sessão do usuário (cookies), no padrão oficial do @supabase/ssr.
// Em route handlers os cookies renovados são gravados na resposta; em Server
// Components o Next não permite gravar cookies (o middleware cuida disso nas
// páginas /admin).
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Chamado de um Server Component: ignorado, o middleware renova.
          }
        },
      },
    }
  );
}
