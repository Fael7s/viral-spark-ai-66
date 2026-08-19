
-- refund_generation: gives back one daily generation when the work that was
-- already debited never got delivered.
--
-- consume_generation debits before the AI gateway call, on purpose: the debit
-- has to stay atomic (ON CONFLICT DO UPDATE + FOR UPDATE lock the row), and
-- debiting after the call would open a race where two concurrent requests both
-- read the counter below the limit and both pass. So the fix is to refund on
-- the failure paths instead of reordering.
--
-- Same shape as the other functions in this schema: SECURITY DEFINER with a
-- fixed search_path, identity derived from auth.uid() internally, and no
-- user_id argument, so a caller cannot refund someone else's quota.
CREATE OR REPLACE FUNCTION public.refund_generation()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _count INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Only refunds within the same day the debit happened. A row whose
  -- reset_date is in the past already counts as zero for today, so touching
  -- it would hand out a generation that was never debited today.
  UPDATE public.usage_limits
     SET daily_count = GREATEST(daily_count - 1, 0),
         updated_at = now()
   WHERE user_id = _uid
     AND reset_date = CURRENT_DATE
  RETURNING daily_count INTO _count;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('refunded', false, 'count', NULL);
  END IF;

  RETURN jsonb_build_object('refunded', true, 'count', _count);
END;
$$;

REVOKE ALL ON FUNCTION public.refund_generation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refund_generation() TO authenticated;
