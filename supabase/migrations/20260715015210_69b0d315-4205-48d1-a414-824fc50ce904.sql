
-- Idempotency table for Stripe webhook events
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
  stripe_event_id TEXT PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

GRANT ALL ON public.processed_webhooks TO service_role;

ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (webhook) writes/reads.

-- Rate limit function: counts recent successful generations for the user.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _user_id UUID,
  _window_seconds INT DEFAULT 60,
  _max_requests INT DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INT;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.generations
  WHERE user_id = _user_id
    AND created_at > NOW() - (_window_seconds || ' seconds')::INTERVAL;
  RETURN request_count < _max_requests;
END;
$$;
