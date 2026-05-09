
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  blocked_by text,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read blocked_users" ON public.blocked_users FOR SELECT USING (true);
CREATE POLICY "public insert blocked_users" ON public.blocked_users FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete blocked_users" ON public.blocked_users FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.telegram_admins (
  telegram_id bigint PRIMARY KEY,
  added_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read telegram_admins" ON public.telegram_admins FOR SELECT USING (true);
CREATE POLICY "public insert telegram_admins" ON public.telegram_admins FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete telegram_admins" ON public.telegram_admins FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.banned_payments (
  payment_id uuid PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banned_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read banned_payments" ON public.banned_payments FOR SELECT USING (true);
CREATE POLICY "public insert banned_payments" ON public.banned_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete banned_payments" ON public.banned_payments FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id text NOT NULL,
  action text NOT NULL,
  target text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read admin_action_logs" ON public.admin_action_logs FOR SELECT USING (true);
CREATE POLICY "public insert admin_action_logs" ON public.admin_action_logs FOR INSERT WITH CHECK (true);

ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'paypal',
  ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT 'image';
