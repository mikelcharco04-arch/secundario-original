
CREATE TABLE public.payment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_trade_no text NOT NULL UNIQUE,
  prepay_id text,
  binance_order_id text,
  email text,
  plan_id text NOT NULL,
  plan_label text NOT NULL,
  key_type text NOT NULL,
  duration text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USDT',
  status text NOT NULL DEFAULT 'pending',
  assigned_key text,
  qr_url text,
  checkout_url text,
  deeplink text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  raw_webhook jsonb
);

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read payment_orders" ON public.payment_orders FOR SELECT USING (true);
CREATE POLICY "public insert payment_orders" ON public.payment_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "public update payment_orders" ON public.payment_orders FOR UPDATE USING (true);

CREATE INDEX idx_payment_orders_status ON public.payment_orders(status);
CREATE INDEX idx_payment_orders_trade ON public.payment_orders(merchant_trade_no);
