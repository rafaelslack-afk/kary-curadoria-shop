import { createClient } from "@supabase/supabase-js";

// Cliente anônimo SEM cookies de sessão, para rotas públicas da loja.
// Usar o cliente com cookies (lib/supabase/server) numa rota pública faz o
// supabase-js renovar o token de quem estiver logado no admin no mesmo
// navegador a cada consulta; aqui nenhuma consulta toca o Auth.
export function createAnonClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
