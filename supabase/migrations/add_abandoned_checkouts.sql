CREATE TABLE abandoned_checkouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar(200),
  email varchar(200) NOT NULL,
  phone varchar(20),
  cart_items jsonb NOT NULL,
  cart_total numeric(10,2),
  recovered boolean DEFAULT false,
  order_id uuid REFERENCES orders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_abandoned_email ON abandoned_checkouts(email);
CREATE INDEX idx_abandoned_created ON abandoned_checkouts(created_at DESC);

ALTER TABLE abandoned_checkouts ENABLE ROW LEVEL SECURITY;
