
-- 1. Add referral columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- 2. Short, non-sequential referral code generator (10 chars, alphabet without ambiguous glyphs)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
  attempts INT := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..10 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = code);
    attempts := attempts + 1;
    IF attempts > 8 THEN
      RAISE EXCEPTION 'Could not allocate referral code';
    END IF;
  END LOOP;
  RETURN code;
END;
$$;

-- 3. Backfill existing profiles missing a code
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    UPDATE public.profiles SET referral_code = public.generate_referral_code() WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.profiles ALTER COLUMN referral_code SET NOT NULL;

-- 4. referral_bonuses table
CREATE TABLE IF NOT EXISTS public.referral_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bonus_generations INTEGER NOT NULL DEFAULT 5,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (source_user_id)
);

GRANT SELECT ON public.referral_bonuses TO authenticated;
GRANT ALL ON public.referral_bonuses TO service_role;

ALTER TABLE public.referral_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral bonuses"
  ON public.referral_bonuses FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_referral_bonuses_user_date
  ON public.referral_bonuses (user_id, granted_date);

-- 5. Updated handle_new_user: allocate referral_code, capture referred_by, grant bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _referrer_code TEXT := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');
  _referrer_id UUID;
  _today_bonus INT;
  _daily_bonus_cap CONSTANT INT := 20;
  _bonus_per_signup CONSTANT INT := 5;
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    public.generate_referral_code(),
    _referrer_code
  );
  INSERT INTO public.subscriptions (user_id, plan, status) VALUES (NEW.id, 'free', 'active');
  INSERT INTO public.usage_limits (user_id, daily_count, reset_date) VALUES (NEW.id, 0, CURRENT_DATE);

  IF _referrer_code IS NOT NULL THEN
    SELECT id INTO _referrer_id
    FROM public.profiles
    WHERE referral_code = _referrer_code
      AND id <> NEW.id
    LIMIT 1;

    IF _referrer_id IS NOT NULL THEN
      SELECT COALESCE(SUM(bonus_generations), 0) INTO _today_bonus
      FROM public.referral_bonuses
      WHERE user_id = _referrer_id AND granted_date = CURRENT_DATE;

      IF _today_bonus + _bonus_per_signup <= _daily_bonus_cap THEN
        INSERT INTO public.referral_bonuses (user_id, source_user_id, bonus_generations)
        VALUES (_referrer_id, NEW.id, _bonus_per_signup)
        ON CONFLICT (source_user_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. consume_generation: add today's referral bonus to the base limit
CREATE OR REPLACE FUNCTION public.consume_generation(_free_limit integer, _pro_limit integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _plan public.plan_type;
  _base_limit INTEGER;
  _bonus INTEGER;
  _limit INTEGER;
  _count INTEGER;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT plan INTO _plan FROM public.subscriptions WHERE user_id = _uid;
  IF _plan IS NULL THEN
    INSERT INTO public.subscriptions (user_id, plan, status) VALUES (_uid, 'free', 'active')
    ON CONFLICT (user_id) DO NOTHING;
    _plan := 'free';
  END IF;

  _base_limit := CASE WHEN _plan = 'pro' THEN _pro_limit ELSE _free_limit END;

  SELECT COALESCE(SUM(bonus_generations), 0) INTO _bonus
  FROM public.referral_bonuses
  WHERE user_id = _uid AND granted_date = CURRENT_DATE;

  _limit := _base_limit + _bonus;

  INSERT INTO public.usage_limits (user_id, daily_count, reset_date)
  VALUES (_uid, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
    SET daily_count = CASE WHEN public.usage_limits.reset_date < CURRENT_DATE THEN 0 ELSE public.usage_limits.daily_count END,
        reset_date = CURRENT_DATE;

  SELECT daily_count INTO _count FROM public.usage_limits WHERE user_id = _uid FOR UPDATE;

  IF _count >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'count', _count, 'limit', _limit, 'plan', _plan, 'bonus', _bonus);
  END IF;

  UPDATE public.usage_limits SET daily_count = daily_count + 1, updated_at = now() WHERE user_id = _uid;
  RETURN jsonb_build_object('allowed', true, 'count', _count + 1, 'limit', _limit, 'plan', _plan, 'bonus', _bonus);
END;
$$;
