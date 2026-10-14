-- Controle por produto: aparece (ou não) na área de atacado.
-- Só a área de atacado lê este campo; o varejo não muda.
-- Todos os produtos começam ativados (comportamento anterior).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS atacado_enabled boolean NOT NULL DEFAULT true;
