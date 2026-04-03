-- =============================================================================
-- Migration: Corrigir transicao para paid sem dupla baixa de estoque
-- =============================================================================
-- O estoque ja e reservado pela aplicacao durante o checkout.
-- Ao mudar o pedido para "paid", o banco nao deve debitar novamente:
-- apenas converter a reserva vinculada em "saida".
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_handle_order_status_change()
RETURNS trigger AS $$
DECLARE
    item        RECORD;
    bundle_comp RECORD;
    prod_type   varchar(20);
BEGIN
    -- PAID: converter reservas existentes em saida, sem nova baixa
    IF OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid' THEN
        UPDATE inventory_log
           SET type = 'saida',
               sales_channel = 'online',
               reason = 'Venda online - pedido #' || NEW.order_number
         WHERE order_id = NEW.id
           AND type = 'reserva';
    END IF;

    -- CANCELLED: restaurar estoque
    IF OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
        FOR item IN
            SELECT oi.variant_id, oi.product_id, oi.quantity
              FROM order_items oi WHERE oi.order_id = NEW.id
        LOOP
            SELECT product_type INTO prod_type FROM products WHERE id = item.product_id;

            IF prod_type = 'conjunto' THEN
                FOR bundle_comp IN
                    SELECT pbi.variant_id, pbi.quantity AS comp_qty
                      FROM product_bundle_items pbi WHERE pbi.bundle_product_id = item.product_id
                LOOP
                    UPDATE product_variants
                       SET stock_qty = stock_qty + (bundle_comp.comp_qty * item.quantity)
                     WHERE id = bundle_comp.variant_id;

                    INSERT INTO inventory_log (variant_id, product_id, type, sales_channel, quantity, reason, order_id)
                    SELECT bundle_comp.variant_id, pv.product_id, 'ajuste', NULL,
                           (bundle_comp.comp_qty * item.quantity),
                           'Cancelamento conjunto - pedido #' || NEW.order_number, NEW.id
                      FROM product_variants pv WHERE pv.id = bundle_comp.variant_id;
                END LOOP;
            ELSE
                UPDATE product_variants
                   SET stock_qty = stock_qty + item.quantity WHERE id = item.variant_id;

                INSERT INTO inventory_log (variant_id, product_id, type, sales_channel, quantity, reason, order_id)
                VALUES (item.variant_id, item.product_id, 'ajuste', NULL, item.quantity,
                        'Cancelamento pedido #' || NEW.order_number, NEW.id);
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
