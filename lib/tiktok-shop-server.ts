// Leitura server-only da configuração do convite TikTok Shop (system_config).
// NUNCA importar em código client-side (usa a service role).
import { createNoStoreAdminClient } from "@/lib/supabase/admin-no-store";
import {
  TIKTOK_SHOP_CONFIG_KEY,
  TIKTOK_SHOP_DEFAULT,
  parseTikTokShopConfig,
  type TikTokShopConfig,
} from "@/lib/tiktok-shop";

/**
 * Configuração atual. Sem registro no banco → padrão (ativo).
 * Erro de leitura → desligado, para nunca mostrar algo que o admin desligou.
 */
export async function getTikTokShopConfig(): Promise<TikTokShopConfig> {
  try {
    const { data, error } = await createNoStoreAdminClient()
      .from("system_config")
      .select("value")
      .eq("key", TIKTOK_SHOP_CONFIG_KEY)
      .maybeSingle();
    if (error) {
      console.error("[TikTok Shop] Falha ao ler configuração:", error.message);
      return { ...TIKTOK_SHOP_DEFAULT, ativo: false };
    }
    if (!data?.value) return { ...TIKTOK_SHOP_DEFAULT };
    return parseTikTokShopConfig(data.value);
  } catch (err) {
    console.error("[TikTok Shop] Erro ao ler configuração:", err);
    return { ...TIKTOK_SHOP_DEFAULT, ativo: false };
  }
}
