-- Enum for plan and platform/tone
CREATE TYPE public.plan_type AS ENUM ('free', 'pro');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- SUBSCRIPTIONS
CREATE TABLE public.subscriptions (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_type NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- GENERATIONS
CREATE TABLE public.generations (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  tone TEXT NOT NULL,
  input_topic TEXT NOT NULL,
  input_transcript TEXT,
  result_hooks JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_captions JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_emojis JSONB NOT NULL DEFAULT '[]'::jsonb,
  result_hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_generations_user_created ON public.generations(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;
GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own generations" ON public.generations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, generation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- USAGE LIMITS
CREATE TABLE public.usage_limits (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_count INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.usage_limits TO authenticated;
GRANT ALL ON public.usage_limits TO service_role;
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON public.usage_limits FOR SELECT USING (auth.uid() = user_id);

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- New user handler: create profile, subscription (free), usage row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.subscriptions (user_id, plan, status) VALUES (NEW.id, 'free', 'active');
  INSERT INTO public.usage_limits (user_id, daily_count, reset_date) VALUES (NEW.id, 0, CURRENT_DATE);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic daily-limit consume: returns TRUE if allowed and increments, FALSE if limit reached.
-- Pro plan gets a high soft cap; free gets the passed free limit.
CREATE OR REPLACE FUNCTION public.consume_generation(_free_limit INTEGER, _pro_limit INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _plan public.plan_type;
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

  _limit := CASE WHEN _plan = 'pro' THEN _pro_limit ELSE _free_limit END;

  -- Atomic upsert + reset-if-new-day + increment in one statement
  INSERT INTO public.usage_limits (user_id, daily_count, reset_date)
  VALUES (_uid, 0, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE
    SET daily_count = CASE WHEN public.usage_limits.reset_date < CURRENT_DATE THEN 0 ELSE public.usage_limits.daily_count END,
        reset_date = CURRENT_DATE;

  SELECT daily_count INTO _count FROM public.usage_limits WHERE user_id = _uid FOR UPDATE;

  IF _count >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'count', _count, 'limit', _limit, 'plan', _plan);
  END IF;

  UPDATE public.usage_limits SET daily_count = daily_count + 1, updated_at = now() WHERE user_id = _uid;
  RETURN jsonb_build_object('allowed', true, 'count', _count + 1, 'limit', _limit, 'plan', _plan);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_generation(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_generation(INTEGER, INTEGER) TO authenticated;