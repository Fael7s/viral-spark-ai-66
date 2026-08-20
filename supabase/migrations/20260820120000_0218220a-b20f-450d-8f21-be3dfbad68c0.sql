-- Origin attribution on signup, plus an internal-account flag.
--
-- Section 1 adds the columns, section 2 rewrites handle_new_user so it writes
-- to them. Both live in the same file on purpose: handle_new_user runs as the
-- on_auth_user_created trigger (20260708215650), so applying the function
-- without the columns makes the INSERT into profiles fail, which rolls back the
-- INSERT into auth.users and breaks every new signup. Same shape as
-- 20260716233309, which added the referral columns and rewrote the function in
-- a single file.
--
-- Two notes for the Lovable SQL editor this gets pasted into:
--
--   1. It returns only the result set of the LAST statement in the block, so
--      the last statement here is a verification SELECT. Expect exactly 6 rows,
--      one per column added in section 1.
--   2. It has been seen appending a stray closing parenthesis at the end of
--      pasted text. This file therefore ends on a comment line, which absorbs
--      it, and every parenthesis below is balanced so the auto-close has
--      nothing to complete. If a lone closing parenthesis still lands on a line
--      of its own, delete it and run again: the whole batch fails to parse in
--      that case, so nothing is half applied.

-- 1. Attribution and internal-account columns on profiles.
-- No existing column is altered.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_internal   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS utm_source    TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium    TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign  TEXT,
  ADD COLUMN IF NOT EXISTS landing_path  TEXT,
  ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ;

-- 2. handle_new_user: the body from 20260716233309 with the attribution fields
-- added to the profiles INSERT. Nothing about the referral programme changes.
-- The subscriptions and usage_limits inserts, the referrer lookup, the daily
-- bonus cap and the referral_bonuses insert are all unchanged.
--
-- is_internal is deliberately not set here. It keeps its DEFAULT false and is
-- flipped by hand for the few accounts that need it.
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
  -- raw_user_meta_data is written by the client at signUp, so these values
  -- arrive untrusted even though the front-end sanitises them first. LEFT caps
  -- the length here too, matching the 64-character limit in
  -- src/lib/attribution.ts.
  _utm_source   TEXT := LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'utm_source'), ''), 64);
  _utm_medium   TEXT := LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'utm_medium'), ''), 64);
  _utm_campaign TEXT := LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'utm_campaign'), ''), 64);
  _landing_path TEXT := LEFT(NULLIF(TRIM(NEW.raw_user_meta_data->>'landing_path'), ''), 64);
  _first_seen_at TIMESTAMPTZ;
BEGIN
  -- A malformed timestamp from the client must never abort the signup, so the
  -- cast gets its own block and falls back to NULL.
  BEGIN
    _first_seen_at := NULLIF(TRIM(NEW.raw_user_meta_data->>'first_seen_at'), '')::timestamptz;
  EXCEPTION WHEN others THEN
    _first_seen_at := NULL;
  END;

  INSERT INTO public.profiles (
    id, display_name, avatar_url, referral_code, referred_by,
    utm_source, utm_medium, utm_campaign, landing_path, first_seen_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    public.generate_referral_code(),
    _referrer_code,
    _utm_source,
    _utm_medium,
    _utm_campaign,
    _landing_path,
    _first_seen_at
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

-- Idempotent restatement of the grants from 20260708215745. CREATE OR REPLACE
-- keeps the existing ACL, so this changes nothing; it is here so the file
-- states the intended privileges instead of relying on migration history.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3. Verification, deliberately last so the editor actually shows it.
-- Expect 6 rows: first_seen_at, is_internal, landing_path, utm_campaign,
-- utm_medium, utm_source. is_internal should read NOT NULL with default false.
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name = 'profiles'
   AND column_name IN ('is_internal', 'utm_source', 'utm_medium', 'utm_campaign', 'landing_path', 'first_seen_at')
 ORDER BY column_name;

-- End of migration. This trailing comment line is intentional: it absorbs a
-- stray closing parenthesis appended by the editor's auto-close on paste.