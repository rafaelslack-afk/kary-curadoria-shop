-- =============================================================================
-- KVO (Kary Vendas Online) - Fashion E-commerce Platform
-- Complete Database Schema for Supabase (PostgreSQL)
-- =============================================================================
-- Execution order respects foreign-key dependencies.
-- Run this file once against a fresh Supabase project.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()


-- ---------------------------------------------------------------------------
-- 1. CATEGORIES
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
    id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
    name       varchar(100) NOT NULL,
    slug       varchar(100) UNIQUE NOT NULL,
    parent_id  uuid        REFERENCES categories(id),
    active     boolean     DEFAULT true,
    created_at timestamptz DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 2. PRODUCTS
-- ---------------------------------------------------------------------------
CREATE TABLE products (
    id             uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    name           varchar(200)  NOT NULL,
    slug           varchar(200)  UNIQUE NOT NULL,
    description    text,
    price          numeric(10,2) NOT NULL,
    original_price numeric(10,2),                       -- shows crossed-out price
    category_id    uuid          REFERENCES categories(id),
    images         text[],                               -- URLs in Supabase Storage
    weight_g       integer,                              -- shipping calc
    length_cm      integer,                              -- shipping calc
    width_cm       integer,                              -- shipping calc
    height_cm      integer,                              -- shipping calc
    sku_base       varchar(100),
    active         boolean       DEFAULT true,
    featured       boolean       DEFAULT false,
    created_at     timestamptz   DEFAULT now(),
    updated_at     timestamptz   DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 3. PRODUCT VARIANTS  (stock lives here, NOT in products)
-- ---------------------------------------------------------------------------
CREATE TABLE product_variants (
    id          uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id  uuid         NOT NULL REFERENCES products(id),
    size        varchar(20)  NOT NULL,                   -- P, M, G, GG, GGG, Unico, 36, 38 ...
    sku         varchar(120) UNIQUE NOT NULL,            -- e.g. CONJ-LIN-BRC-M
    stock_qty   integer      DEFAULT 0 NOT NULL,
    stock_min   integer      DEFAULT 3,
    active      boolean      DEFAULT true,
    created_at  timestamptz  DEFAULT now(),
    updated_at  timestamptz  DEFAULT now()               -- kept in sync by trigger
);


-- ---------------------------------------------------------------------------
-- 4. CUSTOMERS
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
    id           uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
    name         varchar(200) NOT NULL,
    email        varchar(200) UNIQUE NOT NULL,
    phone        varchar(20),
    cpf          varchar(14),
    address_json jsonb,
    auth_user_id uuid         REFERENCES auth.users(id), -- nullable for guests
    created_at   timestamptz  DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 5. ORDERS
-- ---------------------------------------------------------------------------
CREATE TABLE orders (
    id                    uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number          serial        UNIQUE,
    customer_id           uuid          REFERENCES customers(id),       -- nullable
    guest_name            varchar(200),
    guest_email           varchar(200),
    guest_cpf             varchar(14),
    status                varchar(30)   DEFAULT 'pending',              -- pending | paid | preparing | shipped | delivered | cancelled
    subtotal              numeric(10,2) NOT NULL,
    shipping_cost         numeric(10,2) DEFAULT 0,
    shipping_service      varchar(50),                                  -- PAC | SEDEX ...
    shipping_deadline     integer,                                      -- days
    discount              numeric(10,2) DEFAULT 0,
    coupon_code           varchar(50),
    total                 numeric(10,2) NOT NULL,
    payment_method        varchar(30),                                  -- pix | credit_card | boleto
    pagbank_charge_id     varchar(100),
    pagbank_status        varchar(30),
    shipping_address_json jsonb         NOT NULL,
    tracking_code         varchar(50),                                  -- Correios
    nf_number             varchar(20),
    nf_key                varchar(50),
    nf_status             varchar(20),                                  -- emitida | cancelada
    notes                 text,
    created_at            timestamptz   DEFAULT now(),
    updated_at            timestamptz   DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 6. ORDER ITEMS
-- ---------------------------------------------------------------------------
CREATE TABLE order_items (
    id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id      uuid          NOT NULL REFERENCES orders(id),
    product_id    uuid          NOT NULL REFERENCES products(id),
    variant_id    uuid          NOT NULL REFERENCES product_variants(id),
    product_name  varchar(200)  NOT NULL,                -- snapshot at purchase time
    size_snapshot varchar(20)   NOT NULL,                 -- snapshot
    sku_snapshot  varchar(120),
    quantity      integer       NOT NULL,
    unit_price    numeric(10,2) NOT NULL,
    total_price   numeric(10,2) NOT NULL
);


-- ---------------------------------------------------------------------------
-- 7. INVENTORY LOG
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_log (
    id            uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
    variant_id    uuid         NOT NULL REFERENCES product_variants(id),
    product_id    uuid         NOT NULL REFERENCES products(id),    -- denormalised for easy joins
    type          varchar(20)  NOT NULL,                             -- entrada | saida | ajuste | importacao
    sales_channel varchar(20),                                      -- online | physical | NULL
    quantity      integer      NOT NULL,                             -- positive = in, negative = out
    reason        varchar(200),
    order_id      uuid         REFERENCES orders(id),
    import_file   varchar(200),
    created_by    varchar(100),
    created_at    timestamptz  DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 8. COUPONS
-- ---------------------------------------------------------------------------
CREATE TABLE coupons (
    id         uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
    code       varchar(50)   UNIQUE NOT NULL,
    type       varchar(20)   NOT NULL,                   -- percent | fixed
    value      numeric(10,2) NOT NULL,
    min_order  numeric(10,2) DEFAULT 0,
    max_uses   integer,                                  -- NULL = unlimited
    used_count integer       DEFAULT 0,
    active     boolean       DEFAULT true,
    expires_at timestamptz
);


-- ===========================================================================
-- INDEXES
-- ===========================================================================

-- products
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_active      ON products (active);
CREATE INDEX idx_products_featured    ON products (featured);
CREATE INDEX idx_products_slug        ON products (slug);

-- product_variants
CREATE INDEX idx_variants_product_id ON product_variants (product_id);
CREATE INDEX idx_variants_sku        ON product_variants (sku);
CREATE INDEX idx_variants_active     ON product_variants (active);

-- orders
CREATE INDEX idx_orders_customer_id  ON orders (customer_id);
CREATE INDEX idx_orders_status       ON orders (status);
CREATE INDEX idx_orders_created_at   ON orders (created_at);
CREATE INDEX idx_orders_guest_email  ON orders (guest_email);
CREATE INDEX idx_orders_order_number ON orders (order_number);

-- order_items
CREATE INDEX idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);
CREATE INDEX idx_order_items_variant_id ON order_items (variant_id);

-- inventory_log
CREATE INDEX idx_invlog_variant_id    ON inventory_log (variant_id);
CREATE INDEX idx_invlog_product_id    ON inventory_log (product_id);
CREATE INDEX idx_invlog_type          ON inventory_log (type);
CREATE INDEX idx_invlog_sales_channel ON inventory_log (sales_channel);
CREATE INDEX idx_invlog_created_at    ON inventory_log (created_at);


-- ===========================================================================
-- TRIGGERS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Trigger 1 & 2: Stock deduction on payment / restoration on cancellation
-- ---------------------------------------------------------------------------
-- A single function handles both transitions by inspecting OLD and NEW status.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_handle_order_status_change()
RETURNS trigger AS $$
DECLARE
    item RECORD;
BEGIN
    -- -----------------------------------------------------------------
    -- 1. Order marked as PAID  -->  convert linked reservations to "saida"
    -- The stock has already been reserved by the application at checkout.
    -- -----------------------------------------------------------------
    IF OLD.status IS DISTINCT FROM 'paid' AND NEW.status = 'paid' THEN
        UPDATE inventory_log
           SET type = 'saida',
               sales_channel = 'online',
               reason = 'Venda online - pedido #' || NEW.order_number
         WHERE order_id = NEW.id
           AND type = 'reserva';
    END IF;

    -- -----------------------------------------------------------------
    -- 2. Order CANCELLED  -->  restore stock, log "ajuste"
    -- -----------------------------------------------------------------
    IF OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled' THEN
        FOR item IN
            SELECT oi.variant_id,
                   oi.product_id,
                   oi.quantity
              FROM order_items oi
             WHERE oi.order_id = NEW.id
        LOOP
            -- Restore stock
            UPDATE product_variants
               SET stock_qty = stock_qty + item.quantity
             WHERE id = item.variant_id;

            -- Audit trail
            INSERT INTO inventory_log (variant_id, product_id, type, sales_channel, quantity, reason, order_id)
            VALUES (
                item.variant_id,
                item.product_id,
                'ajuste',
                NULL,
                item.quantity,
                'cancelamento pedido #' || NEW.order_number,
                NEW.id
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_status_change
    BEFORE UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION fn_handle_order_status_change();


-- ---------------------------------------------------------------------------
-- Trigger 3: Auto updated_at on products, orders, product_variants
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION fn_set_updated_at();


-- ===========================================================================
-- ROW LEVEL SECURITY (RLS)
-- ===========================================================================

-- Enable RLS on every table
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons          ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Helper: check if the current JWT contains the 'admin' role claim.
-- Supabase stores custom claims in auth.users.raw_app_meta_data.
-- Set the claim with:
--   UPDATE auth.users
--      SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'::jsonb
--    WHERE id = '<admin-user-uuid>';
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN coalesce(
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- CATEGORIES  --  public read (active only) | admin full
-- ---------------------------------------------------------------------------
CREATE POLICY "categories: public read active"
    ON categories FOR SELECT
    USING (active = true);

CREATE POLICY "categories: admin full access"
    ON categories FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- PRODUCTS  --  public read (active only) | admin full
-- ---------------------------------------------------------------------------
CREATE POLICY "products: public read active"
    ON products FOR SELECT
    USING (active = true);

CREATE POLICY "products: admin full access"
    ON products FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- PRODUCT_VARIANTS  --  public read (active only) | admin full
-- ---------------------------------------------------------------------------
CREATE POLICY "product_variants: public read active"
    ON product_variants FOR SELECT
    USING (active = true);

CREATE POLICY "product_variants: admin full access"
    ON product_variants FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- CUSTOMERS  --  customer reads own row | admin full
-- ---------------------------------------------------------------------------
CREATE POLICY "customers: read own"
    ON customers FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "customers: admin full access"
    ON customers FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- ORDERS  --  customer reads own orders | admin full
-- ---------------------------------------------------------------------------
CREATE POLICY "orders: customer read own"
    ON orders FOR SELECT
    USING (
        customer_id IN (
            SELECT id FROM customers WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY "orders: admin full access"
    ON orders FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- ORDER_ITEMS  --  customer reads own order items | admin full
-- ---------------------------------------------------------------------------
CREATE POLICY "order_items: customer read own"
    ON order_items FOR SELECT
    USING (
        order_id IN (
            SELECT o.id FROM orders o
              JOIN customers c ON c.id = o.customer_id
             WHERE c.auth_user_id = auth.uid()
        )
    );

CREATE POLICY "order_items: admin full access"
    ON order_items FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- INVENTORY_LOG  --  admin only
-- ---------------------------------------------------------------------------
CREATE POLICY "inventory_log: admin full access"
    ON inventory_log FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ---------------------------------------------------------------------------
-- COUPONS  --  admin only (validation happens server-side / Edge Function)
-- ---------------------------------------------------------------------------
CREATE POLICY "coupons: admin full access"
    ON coupons FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());


-- ===========================================================================
-- GRANTS  (anon + authenticated need SELECT on public-facing tables)
-- ===========================================================================
GRANT SELECT ON categories       TO anon, authenticated;
GRANT SELECT ON products         TO anon, authenticated;
GRANT SELECT ON product_variants TO anon, authenticated;
GRANT SELECT ON customers        TO authenticated;
GRANT SELECT ON orders           TO authenticated;
GRANT SELECT ON order_items      TO authenticated;

-- Admin operations go through the service_role key or SECURITY DEFINER
-- functions, so no extra GRANT is needed for writes by admins using RLS.


-- ===========================================================================
-- DONE
-- ===========================================================================
