-- =============================================================================
-- Migration: controle da notificação de venda ao ERP (kvo_pending_sales)
-- =============================================================================
-- erp_notified_at        quando o ERP confirmou o recebimento da venda (2xx).
--                        NULL = ainda não notificado.
-- erp_notify_started_at  trava curta: marca um envio em andamento para que
--                        orders/create, webhook MP e admin não enviem o mesmo
--                        pedido ao mesmo tempo. Expira em 60 s.
-- erp_notify_attempts    total de tentativas HTTP feitas até hoje.
-- erp_last_error         último erro (ou observação) do envio.
-- =============================================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS erp_notified_at       timestamptz,
  ADD COLUMN IF NOT EXISTS erp_notify_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS erp_notify_attempts   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS erp_last_error        text;

CREATE INDEX IF NOT EXISTS idx_orders_erp_pending
  ON orders (created_at)
  WHERE erp_notified_at IS NULL;

-- updated_at de orders é usado como data de confirmação do pagamento
-- (GET /api/orders/[id]). Gravar só as colunas erp_* não deve alterá-lo.
CREATE OR REPLACE FUNCTION fn_orders_set_updated_at()
RETURNS trigger AS $$
BEGIN
  IF (to_jsonb(NEW) - 'updated_at' - 'erp_notified_at' - 'erp_notify_started_at'
                    - 'erp_notify_attempts' - 'erp_last_error')
     IS NOT DISTINCT FROM
     (to_jsonb(OLD) - 'updated_at' - 'erp_notified_at' - 'erp_notify_started_at'
                    - 'erp_notify_attempts' - 'erp_last_error') THEN
    NEW.updated_at = OLD.updated_at;
  ELSE
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION fn_orders_set_updated_at();

-- Backfill dos pedidos existentes ------------------------------------------------
-- Pedidos de cartão pagos nos últimos 45 dias ficam NULL: foram os afetados pelo
-- bug (cartão aprovado na criação nunca notificava o ERP) e aparecem no alerta
-- do admin para conferência e reenvio.
UPDATE orders
   SET erp_last_error = 'Anterior à correção — confira no ERP antes de reenviar'
 WHERE erp_notified_at IS NULL
   AND payment_method = 'credit_card'
   AND status IN ('paid', 'preparing', 'shipped', 'delivered')
   AND created_at >= now() - interval '45 days';

-- Demais pedidos pagos já existentes são considerados tratados (histórico),
-- marcados com a observação de backfill para não serem confundidos com envio
-- confirmado. Pendentes e cancelados ficam NULL: se um pendente for pago depois,
-- o fluxo novo notifica normalmente.
UPDATE orders
   SET erp_notified_at = updated_at,
       erp_last_error  = 'Backfill: anterior à correção, envio não verificado'
 WHERE erp_notified_at IS NULL
   AND status IN ('paid', 'preparing', 'shipped', 'delivered')
   AND NOT (
         payment_method = 'credit_card'
     AND created_at >= now() - interval '45 days'
   );
