-- =============================================================================
-- Migration: convite TikTok Shop
-- =============================================================================
-- products.tiktok_shop_url  link opcional do produto na TikTok Shop (tiktok.com).
--                           Vazio: o convite da página do produto leva ao perfil.
-- system_config "tiktok_shop" configuração do convite (Admin → TikTok Shop).
-- =============================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS tiktok_shop_url text;

INSERT INTO system_config (key, value, updated_at)
VALUES (
  'tiktok_shop',
  '{"ativo": true, "url_perfil": "https://www.tiktok.com/@karycuradoria", "texto": "Prefere comprar pelo TikTok? Também estamos na TikTok Shop."}',
  now()
)
ON CONFLICT (key) DO NOTHING;
