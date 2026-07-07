
CREATE TABLE public.referral_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL,
  valid_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT false,
  owner_fingerprint TEXT NOT NULL,
  owner_ip_hash TEXT,
  key_generated TEXT,
  key_expires_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.referral_users TO service_role;
ALTER TABLE public.referral_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access referral_users" ON public.referral_users FOR ALL USING (false) WITH CHECK (false);

CREATE INDEX idx_referral_users_code ON public.referral_users(code);
CREATE INDEX idx_referral_users_fingerprint ON public.referral_users(owner_fingerprint);

CREATE TABLE public.referral_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code TEXT NOT NULL,
  visitor_fingerprint TEXT NOT NULL,
  visitor_ip_hash TEXT NOT NULL,
  user_agent_hash TEXT NOT NULL,
  combined_hash TEXT NOT NULL,
  valid BOOLEAN NOT NULL,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.referral_visits TO service_role;
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no client access referral_visits" ON public.referral_visits FOR ALL USING (false) WITH CHECK (false);

CREATE UNIQUE INDEX idx_referral_visits_unique_valid ON public.referral_visits(referral_code, combined_hash) WHERE valid = true;
CREATE INDEX idx_referral_visits_code ON public.referral_visits(referral_code);
CREATE INDEX idx_referral_visits_fp ON public.referral_visits(visitor_fingerprint);

CREATE OR REPLACE FUNCTION public.update_referral_users_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_referral_users_updated_at
BEFORE UPDATE ON public.referral_users
FOR EACH ROW EXECUTE FUNCTION public.update_referral_users_updated_at();
