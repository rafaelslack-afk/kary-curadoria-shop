import { createClient } from "@supabase/supabase-js";

// Admin client (service role) que força cache: "no-store" em todo fetch.
//
// O Next.js instrumenta o fetch global com seu Data Cache, e isso pode
// cachear as chamadas internas do supabase-js mesmo com
// `export const dynamic = "force-dynamic"` na rota. Use este client para
// leituras de configuração que precisam refletir alterações imediatamente
// (system_config). NUNCA importar em código client-side.
export function createNoStoreAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
