// Leitura server-only dos markups de plus size em system_config.
//
// Mantido separado de lib/pricing.ts (que é importado por componentes
// "use client") porque este arquivo usa Supabase service role — NUNCA
// importar este arquivo de código client-side.
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";

const CONFIG_KEY = "plus_size_markup";

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
