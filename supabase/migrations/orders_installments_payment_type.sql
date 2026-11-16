-- =============================================================================
-- Migration: parcelas e tipo de pagamento do Mercado Pago no pedido
-- =============================================================================
-- installments  parcelas confirmadas pelo Mercado Pago (PIX = 1).
-- payment_type  payment_type_id do Mercado Pago: credit_card, debit_card,
--               bank_transfer (PIX), ticket (boleto).
-- Pedidos antigos ficam NULL (o admin mostra só a forma de pagamento).
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS installments integer,
  ADD COLUMN IF NOT EXISTS payment_type varchar(30);
