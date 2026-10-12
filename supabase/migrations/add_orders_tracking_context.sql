-- Contexto do navegador para a compra (Purchase) na TikTok Events API.
--
-- O webhook do Mercado Pago confirma o pagamento sem a cliente no site, então
-- IP, user agent, cookie _ttp, ttclid e a URL do checkout são guardados no
-- pedido no momento da criação.
--
-- Retenção (lib/tracking/tiktok-server.ts):
-- - após o Purchase ser enviado com sucesso, o campo vira só
--   {"tiktok_purchase_sent_at": "..."} (IP/UA/_ttp/ttclid apagados);
-- - pedidos com mais de 7 dias que ainda guardam esses dados ("pii": true),
--   pagos ou não, são limpos pelo cron /api/cron/cancel-expired-orders.
--
-- O código funciona sem esta coluna (o update falha e é só logado): sem ela,
-- a compra vai ao TikTok sem IP/UA/_ttp/ttclid e sem a marca de envio.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tracking_context jsonb;

-- A limpeza filtra por tracking_context->>'pii' = 'true' (poucas linhas).
CREATE INDEX IF NOT EXISTS orders_tracking_context_pii_idx
  ON orders (created_at)
  WHERE tracking_context ->> 'pii' = 'true';
