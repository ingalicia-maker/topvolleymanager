-- Season pass (one payment, 12 months, no auto-renewal) and a 14-day Pro trial for new accounts.
--
-- `status` keeps meaning "auto-renewing subscription tier" (set by the RevenueCat webhook for
-- App Store / Google Play, and by check-subscription for Stripe on the web).
-- Time-limited access lives in its own columns so it never fights with `status`:
--   pass_tier / pass_until  -> season pass bought in the store or on the web
--   trial_ends_at           -> free Pro trial for new accounts
-- The app uses the best of the three that is still valid.
-- status_source records who set `status`, so the Stripe sync never downgrades a store subscriber.

ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS pass_tier public.subscription_status,
  ADD COLUMN IF NOT EXISTS pass_until timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS status_source text,
  ADD COLUMN IF NOT EXISTS pass_last_txn text;  -- last store transaction applied (webhooks can be delivered twice)

-- New accounts start with 14 days of Pro (VIP/admin accounts don't need it).
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status subscription_status;
BEGIN
  IF public.is_vip_user(NEW.email) OR public.is_app_admin(NEW.email) THEN
    _status := 'vip';
  ELSE
    _status := 'free';
  END IF;

  INSERT INTO public.user_subscriptions (user_id, status, trial_ends_at)
  VALUES (NEW.id, _status, CASE WHEN _status = 'free' THEN now() + interval '14 days' END)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Credits: an active season pass or trial counts as a paid plan.
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
  _user_email text;
BEGIN
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  IF public.is_vip_user(_user_email) OR public.is_app_admin(_user_email) THEN
    RETURN TRUE;
  END IF;

  SELECT status, pass_until, trial_ends_at INTO _sub
  FROM public.user_subscriptions WHERE user_id = _user_id;

  IF _sub.status IS NOT NULL AND _sub.status <> 'free' THEN
    RETURN TRUE;
  END IF;
  IF _sub.pass_until > now() OR _sub.trial_ends_at > now() THEN
    RETURN TRUE;
  END IF;

  PERFORM public.get_user_credits(_user_id);

  UPDATE public.user_credits
  SET credits_remaining = credits_remaining - 1
  WHERE user_id = _user_id
    AND credits_date = CURRENT_DATE
    AND credits_remaining > 0;

  RETURN FOUND;
END;
$$;
