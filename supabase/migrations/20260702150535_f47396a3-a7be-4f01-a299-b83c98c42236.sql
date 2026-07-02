CREATE TABLE public.telegram_bot_sessions (
  chat_id BIGINT PRIMARY KEY,
  authed BOOLEAN NOT NULL DEFAULT false,
  step TEXT,
  duration TEXT,
  key_type TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.telegram_bot_sessions TO service_role;
ALTER TABLE public.telegram_bot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service only" ON public.telegram_bot_sessions FOR ALL USING (false) WITH CHECK (false);