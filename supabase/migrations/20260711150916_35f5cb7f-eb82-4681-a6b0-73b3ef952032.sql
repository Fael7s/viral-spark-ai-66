-- 1. generations: replace FOR ALL policy with SELECT-only
DROP POLICY IF EXISTS "Users manage own generations" ON public.generations;
CREATE POLICY "Users read own generations"
  ON public.generations
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Revoke excessive grants (defense in depth). Keep SELECT + service_role full.
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.usage_limits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.generations FROM authenticated;

-- 3. favorites: enforce ownership of the generation on INSERT
DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;
CREATE POLICY "Users read own favorites"
  ON public.favorites
  FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own favorites"
  ON public.favorites
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.generations g
      WHERE g.id = generation_id AND g.user_id = auth.uid()
    )
  );
CREATE POLICY "Users delete own favorites"
  ON public.favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- 6. subscriptions: track last processed Stripe event time for ordering
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS last_stripe_event_created timestamptz;