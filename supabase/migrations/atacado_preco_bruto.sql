-- Atacado: preço bruto (sem desconto) por item e percentuais vigentes no pedido.
--
-- Só para o ADMIN: a área pública (romaneio, mensagem de WhatsApp) nunca lê
-- estas colunas. Sem preenchimento retroativo: pedidos antigos ficam com NULL.
--
-- price_overridden já existe (create_atacado.sql); o IF NOT EXISTS abaixo é um
-- no-op nele e só garante a coluna em ambientes que não a tenham.
--
-- base_unit_price: preço de varejo unitário no momento do pedido (promocional,
--   se havia promoção), JÁ com o acréscimo plus size (G1/G2/G3) e SEM desconto
--   de atacado.
-- price_overridden: true quando o admin altera o preço unitário à mão.
-- discount_snapshot: percentuais vigentes na criação, ex.: {"pix":20,"credit_card":10}.
alter table public.wholesale_order_items
  add column if not exists base_unit_price numeric(10, 2),
  add column if not exists price_overridden boolean not null default false;

alter table public.wholesale_orders
  add column if not exists discount_snapshot jsonb;
