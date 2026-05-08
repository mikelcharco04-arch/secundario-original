ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS device_fingerprint text;

ALTER TABLE public.proxy_keys
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS payment_request_id uuid;