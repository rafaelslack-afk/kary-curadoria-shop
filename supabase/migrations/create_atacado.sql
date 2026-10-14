-- ============================================================================
-- Atacado: pedidos, itens e configurações.
--
-- Totalmente separado do varejo: não referencia orders, não mexe em estoque,
-- não dispara triggers de inventário nem integrações (ERP, pagamento, e-mail).
-- Acesso só pelo servidor (service role): RLS sem policies e sem grants para
-- anon/authenticated, mesmo padrão das tabelas do assistente virtual.
-- ============================================================================

-- Número sequencial ATC-0001, ATC-0002, ...
create sequence if not exists public.wholesale_order_seq start 1;

create table if not exists public.wholesale_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('ATC-' || lpad(nextval('public.wholesale_order_seq')::text, 4, '0')),
  status text not null default 'novo'
    check (status in ('novo', 'em_negociacao', 'aguardando_pagamento', 'pago', 'enviado', 'cancelado')),
  payment_method text not null check (payment_method in ('pix', 'credit_card')),
  customer_name text not null,
  store_name text,
  document text not null,               -- CPF ou CNPJ, só dígitos
  email text not null,
  phone text not null,
  address_json jsonb not null,          -- { cep, logradouro, numero, complemento, bairro, cidade, uf }
  notes text,
  items_total numeric(12, 2) not null default 0,
  shipping_cost numeric(12, 2),         -- preenchido pela equipe no admin
  total numeric(12, 2) not null default 0,
  pieces_count integer not null default 0,
  romaneio_token text not null unique,  -- link público do romaneio (aleatório e longo)
  ip_hash text,                          -- HMAC do IP, só para limitar envios por hora
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter sequence public.wholesale_order_seq owned by public.wholesale_orders.order_number;

create table if not exists public.wholesale_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.wholesale_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  sku text,
  reference text,                        -- referência do produto (sku_base) no momento do pedido
  product_name text not null,
  color text,
  size text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  price_overridden boolean not null default false,  -- preço editado à mão no admin (negociação)
  created_at timestamptz not null default now()
);

create index if not exists idx_wholesale_orders_status_created on public.wholesale_orders (status, created_at desc);
create index if not exists idx_wholesale_orders_created on public.wholesale_orders (created_at desc);
create index if not exists idx_wholesale_orders_ip_created on public.wholesale_orders (ip_hash, created_at);
create index if not exists idx_wholesale_order_items_order on public.wholesale_order_items (order_id);

alter table public.wholesale_orders enable row level security;
alter table public.wholesale_order_items enable row level security;
revoke all on public.wholesale_orders from anon, authenticated;
revoke all on public.wholesale_order_items from anon, authenticated;
revoke all on sequence public.wholesale_order_seq from anon, authenticated;

-- Configurações (editáveis no admin). Não sobrescreve valores já existentes.
insert into public.system_config (key, value) values
  ('atacado_descontos', '{"pix":20,"credit_card":10}'),
  ('atacado_minimo_pecas', '6'),
  ('atacado_token', replace(gen_random_uuid()::text, '-', '')),  -- 32 caracteres aleatórios
  ('atacado_whatsapp', '5511940224088'),
  ('atacado_aviso_novidades', '{"ativo":true,"texto":"Lançamentos e novidades: algumas peças novas ainda não estão neste catálogo. Fale com a gente no WhatsApp para receber fotos, vídeos e informações."}')
on conflict (key) do nothing;
