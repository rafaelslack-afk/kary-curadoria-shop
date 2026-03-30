-- =============================================================================
-- Migration: Tipo de Mercadoria (Individual / Conjunto) + Preço de Custo
-- =============================================================================
-- Execute this migration against your Supabase project (SQL Editor).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add product_type to products
--    'individual' = produto normal com SKU/variantes próprias
--    'conjunto'   = composto por variantes individuais, sem SKU próprio
-- ---------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS product_type varchar(20)
    NOT NULL DEFAULT 'individual'
    CHECK (product_type IN ('individual', 'conjunto'));

-- ---------------------------------------------------------------------------
-- 2. Add cost_price to products
-- ---------------------------------------------------------------------------
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS cost_price numeric(10,2);

-- ---------------------------------------------------------------------------
-- 3. Create product_bundle_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_bundle_items (
    id                uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
    bundle_product_id uuid         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id        uuid         NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity          integer      NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at        timestamptz  DEFAULT now(),
    UNIQUE (bundle_product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id  ON product_bundle_items (bundle_product_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_variant_id ON product_bundle_items (variant_id);

-- ---------------------------------------------------------------------------
-- 4. Make order_items.variant_id nullable (conjuntos não têm variante própria)
-- ---------------------------------------------------------------------------
ALTER TABLE order_items
  ALTER COLUMN variant_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. RLS for product_bundle_items
-- ---------------------------------------------------------------------------
ALTER TABLE product_bundle_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_items: public read"
    ON product_bundle_items FOR SELECT USING (true);

CREATE POLICY "bundle_items: admin full access"
    ON product_bundle_items FOR ALL
    USING (is_admin()) WITH CHECK (is_admin());

GRANT SELECT ON product_bundle_items TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Update stock trigger to handle bundles proportionally
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_handle_order_status_change()
RETURNS trigger AS $$
DECLARE
    item        RECORD;
    bundle_comp RECORD;
    prod_type   varchar(20);
BEGIN
    -- PAID: deduct stock
    IF OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid' THEN
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
                       SET stock_qty = stock_qty - (bundle_comp.comp_qty * item.quantity)
                     WHERE id = bundle_comp.variant_id;

                    INSERT INTO inventory_log (variant_id, product_id, type, sales_channel, quantity, reason, order_id)
                    SELECT bundle_comp.variant_id, pv.product_id, 'saida', 'online',
                           -(bundle_comp.comp_qty * item.quantity),
                           'Venda conjunto - pedido #' || NEW.order_number, NEW.id
                      FROM product_variants pv WHERE pv.id = bundle_comp.variant_id;
                END LOOP;
            ELSE
                UPDATE product_variants
                   SET stock_qty = stock_qty - item.quantity WHERE id = item.variant_id;

                INSERT INTO inventory_log (variant_id, product_id, type, sales_channel, quantity, reason, order_id)
                VALUES (item.variant_id, item.product_id, 'saida', 'online', -item.quantity,
                        'Venda online - pedido #' || NEW.order_number, NEW.id);
            END IF;
        END LOOP;
    END IF;

    -- CANCELLED: restore stock
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

-- =============================================================================
-- DONE — Execute no SQL Editor do Supabase.
-- =============================================================================
