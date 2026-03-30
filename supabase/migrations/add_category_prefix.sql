-- Adiciona coluna prefix na tabela categories para geração automática de SKU
-- Executar no Supabase SQL Editor

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS prefix varchar(10);

-- Atualizar categorias existentes com seus prefixos:
-- UPDATE categories SET prefix = 'LIN' WHERE slug = 'conjuntos-de-linho';
-- UPDATE categories SET prefix = 'ALF' WHERE slug = 'alfaiataria-casual';
-- UPDATE categories SET prefix = 'VES' WHERE slug = 'vestidos';
-- (ajuste os slugs conforme suas categorias reais)
