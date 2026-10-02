import { createBrowserClient } from "@supabase/ssr";

// Cliente do navegador: usado só para login e logout do admin. A renovação
// do token fica no servidor (middleware e requireAdmin), que grava os cookies
// novos na resposta; renovar também aqui criava disputa entre os dois
// (409 conflict no Auth) e eventos token_refreshed em dobro.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false } }
  );
}
