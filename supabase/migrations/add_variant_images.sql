-- Adiciona campo images em product_variants para suportar
-- troca de galeria ao selecionar cor na página de produto.
ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS images text[] DEFAULT '{}';
