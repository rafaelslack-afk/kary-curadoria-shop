-- Banners gerenciáveis pelo admin
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS banners (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title         varchar(200),
  subtitle      text,
  button_text   varchar(100),
  button_link   varchar(500),
  image_desktop text,
  image_mobile  text,
  text_position varchar(10)  DEFAULT 'center',  -- 'center' | 'left' | 'right'
  text_color    varchar(10)  DEFAULT 'light',   -- 'light' | 'dark'
  order_index   integer      DEFAULT 0,
  active        boolean      DEFAULT true,
  created_at    timestamptz  DEFAULT now(),
  updated_at    timestamptz  DEFAULT now()
);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_banners" ON banners
  FOR SELECT USING (active = true);

CREATE POLICY "admin_all_banners" ON banners
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION update_banners_updated_at();

-- Storage bucket (executar via Supabase Dashboard > Storage ou API):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('banners', 'banners', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
-- ON CONFLICT (id) DO NOTHING;
