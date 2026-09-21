// Leitura server-only dos markups de plus size em system_config.
//
// Mantido separado de lib/pricing.ts (que é importado por componentes
// "use client") porque este arquivo usa Supabase service role — NUNCA
// importar este arquivo de código client-side.
import { createClient } from "@supabase/supabase-js";

const CONFIG_KEY = "plus_size_markup";

// Cliente local (não o createAdminClient() compartilhado): força
// cache: "no-store" no fetch. O Next.js instrumenta o fetch global com seu
// Data Cache, e isso pode cachear as chamadas internas do supabase-js mesmo
// com `export const dynamic = "force-dynamic"` na rota — resultado
// confirmado em teste: PUT gravava o novo valor no banco, mas o GET
// seguinte continuava servindo o valor antigo até esse override.
function createNoStoreAdminClient() {
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

export async function getPlusSizeMarkups(): Promise<Record<string, number>> {
  const admin = createNoStoreAdminClient();
  const { data } = await admin
    .from("system_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (!data?.value) return {};

  try {
    const parsed = JSON.parse(data.value);
    if (parsed && typeof parsed === "object") return parsed as Record<string, number>;
    return {};
  } catch {
    return {};
  }
}
