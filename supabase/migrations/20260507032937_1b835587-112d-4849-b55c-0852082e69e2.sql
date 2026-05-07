
CREATE TABLE public.payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_name TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  plan_label TEXT NOT NULL,
  duration TEXT NOT NULL,
  duration_ms BIGINT NOT NULL,
  key_type TEXT NOT NULL DEFAULT 'Normal',
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_verdict TEXT,
  ai_notes TEXT,
  admin_notes TEXT,
  delivered_key TEXT,
  telegram_message_id BIGINT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read payment_requests" ON public.payment_requests FOR SELECT USING (true);
CREATE POLICY "public insert payment_requests" ON public.payment_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "public update payment_requests" ON public.payment_requests FOR UPDATE USING (true);

CREATE INDEX idx_payment_requests_status ON public.payment_requests(status);
CREATE INDEX idx_payment_requests_created ON public.payment_requests(created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_requests;
ALTER TABLE public.payment_requests REPLICA IDENTITY FULL;

INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true);

CREATE POLICY "public read proofs" ON storage.objects FOR SELECT USING (bucket_id = 'payment-proofs');
CREATE POLICY "public upload proofs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-proofs');
