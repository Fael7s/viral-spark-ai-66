CREATE TABLE public.demo_generation_limits (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ip_hash, day)
);
CREATE INDEX idx_demo_generation_limits_ip_day ON public.demo_generation_limits(ip_hash, day);
ALTER TABLE public.demo_generation_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.demo_generation_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.demo_generation_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_demo_generation(_ip_hash TEXT, _daily_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  INSERT INTO public.demo_generation_limits (ip_hash, day, request_count)
  VALUES (_ip_hash, CURRENT_DATE, 0)
  ON CONFLICT (ip_hash, day) DO NOTHING;

  SELECT request_count INTO _count
  FROM public.demo_generation_limits
  WHERE ip_hash = _ip_hash AND day = CURRENT_DATE
  FOR UPDATE;

  IF _count >= _daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'count', _count, 'limit', _daily_limit);
  END IF;

  UPDATE public.demo_generation_limits
  SET request_count = request_count + 1, updated_at = now()
  WHERE ip_hash = _ip_hash AND day = CURRENT_DATE;

  RETURN jsonb_build_object('allowed', true, 'count', _count + 1, 'limit', _daily_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.consume_demo_generation(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_demo_generation(TEXT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.refund_demo_generation(_ip_hash TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.demo_generation_limits
  SET request_count = GREATEST(request_count - 1, 0), updated_at = now()
  WHERE ip_hash = _ip_hash AND day = CURRENT_DATE;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_demo_generation(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_demo_generation(TEXT) TO service_role;