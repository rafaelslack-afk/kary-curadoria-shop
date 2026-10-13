-- Checagem do total do pedido — FASE 1 (só observação).
--
-- Uma linha por pedido criado em /api/orders/create, gravada em segundo plano
-- por lib/order-total-check.ts. Não afeta o pedido: serve para acompanhar se o
-- total cobrado bate com o recalculado no servidor (subtotal pelos itens,
-- desconto pelas regras do cupom, frete pelo comprovante assinado).
--
-- Sem esta tabela o código funciona igual; só não grava a linha (o log
-- TOTAL_DIVERGENTE continua nos logs da Vercel).
CREATE TABLE IF NOT EXISTS order_total_checks (
  id                uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          uuid          REFERENCES orders(id) ON DELETE CASCADE,
  order_number      integer,
  checked_at        timestamptz   DEFAULT now(),
  ok                boolean       NOT NULL,
  reasons           text[]        NOT NULL DEFAULT '{}',
  payment_method    varchar(30),
  has_coupon        boolean       NOT NULL DEFAULT false,
  has_plus_size     boolean       NOT NULL DEFAULT false,
  client_total      numeric(10,2),
  expected_total    numeric(10,2),
  client_subtotal   numeric(10,2),
  expected_subtotal numeric(10,2),
  client_discount   numeric(10,2),
  expected_discount numeric(10,2),
  client_shipping   numeric(10,2),
  quoted_shipping   numeric(10,2)
);

CREATE INDEX IF NOT EXISTS order_total_checks_checked_at_idx ON order_total_checks (checked_at);

-- Só o service role (servidor) lê e grava; nenhuma policy pública.
ALTER TABLE order_total_checks ENABLE ROW LEVEL SECURITY;

-- ── Acompanhamento da Fase 1 ────────────────────────────────────────────────
-- Critério para seguir à Fase 2: >= 15 pedidos reais com ok = true e nenhum
-- divergente legítimo, incluindo >= 1 com cupom e >= 1 plus size.
--
-- Resumo:
--   SELECT
--     count(*)                                        AS checados,
--     count(*) FILTER (WHERE ok)                      AS sem_divergencia,
--     count(*) FILTER (WHERE NOT ok)                  AS divergentes,
--     count(*) FILTER (WHERE ok AND has_coupon)       AS ok_com_cupom,
--     count(*) FILTER (WHERE ok AND has_plus_size)    AS ok_plus_size
--   FROM order_total_checks;
--
-- Divergências, com motivo (cruzar com o pedido para saber se é legítimo):
--   SELECT c.order_number, c.checked_at, c.reasons, c.payment_method,
--          c.client_total, c.expected_total, c.client_shipping, c.quoted_shipping,
--          c.client_discount, c.expected_discount, o.status
--   FROM order_total_checks c LEFT JOIN orders o ON o.id = c.order_id
--   WHERE NOT c.ok
--   ORDER BY c.checked_at DESC;
