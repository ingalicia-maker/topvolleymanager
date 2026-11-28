-- "Clubes Fundadores": the first 25 clubs get a free Pro season pass (12 months)
-- in exchange for using the app, leaving a store review and letting us show their name.
-- Public visitors apply through submit_founder_application(); app admins review the
-- list and grant the pass with grant_founder_pass(), which writes the same
-- pass_tier/pass_until columns a paid season pass uses.

CREATE TABLE IF NOT EXISTS public.founder_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name text NOT NULL CHECK (char_length(club_name) BETWEEN 2 AND 120),
  city text NOT NULL CHECK (char_length(city) BETWEEN 2 AND 80),
  country text CHECK (char_length(country) <= 60),
  contact_name text NOT NULL CHECK (char_length(contact_name) BETWEEN 2 AND 120),
  email text NOT NULL CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND char_length(email) <= 200),
  phone text CHECK (char_length(phone) <= 40),
  teams_count integer CHECK (teams_count BETWEEN 1 AND 200),
  message text CHECK (char_length(message) <= 1000),
  lang text CHECK (lang IN ('es', 'en', 'it')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS founder_applications_email_key
  ON public.founder_applications (lower(email));

ALTER TABLE public.founder_applications ENABLE ROW LEVEL SECURITY;

-- Only app admins can read or change applications; the public goes through the function below.
DROP POLICY IF EXISTS "Admins manage founder applications" ON public.founder_applications;
CREATE POLICY "Admins manage founder applications"
  ON public.founder_applications FOR ALL TO authenticated
  USING (public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())))
  WITH CHECK (public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())));

GRANT SELECT, UPDATE ON public.founder_applications TO authenticated;

-- Places left out of 25 (approved applications count).
CREATE OR REPLACE FUNCTION public.founder_spots_left()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, 25 - count(*)::integer)
  FROM public.founder_applications WHERE status = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.founder_spots_left() TO anon, authenticated;

-- Public form submission. Returns 'ok', 'duplicate', 'full' or 'invalid'.
CREATE OR REPLACE FUNCTION public.submit_founder_application(
  _club_name text, _city text, _country text, _contact_name text, _email text,
  _phone text, _teams_count integer, _message text, _lang text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.founder_spots_left() <= 0 THEN RETURN 'full'; END IF;
  IF EXISTS (SELECT 1 FROM public.founder_applications WHERE lower(email) = lower(btrim(_email))) THEN
    RETURN 'duplicate';
  END IF;
  -- Light flood guard: at most 30 applications per hour overall.
  IF (SELECT count(*) FROM public.founder_applications WHERE created_at > now() - interval '1 hour') >= 30 THEN
    RETURN 'invalid';
  END IF;
  INSERT INTO public.founder_applications
    (club_name, city, country, contact_name, email, phone, teams_count, message, lang)
  VALUES
    (btrim(_club_name), btrim(_city), NULLIF(btrim(_country), ''), btrim(_contact_name),
     lower(btrim(_email)), NULLIF(btrim(_phone), ''), _teams_count, NULLIF(btrim(_message), ''),
     CASE WHEN _lang IN ('es', 'en', 'it') THEN _lang ELSE 'es' END);
  RETURN 'ok';
EXCEPTION WHEN check_violation OR not_null_violation THEN
  RETURN 'invalid';
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_founder_application(text, text, text, text, text, text, integer, text, text)
  TO anon, authenticated;

-- Admin only: approve an application and give that account 12 months of Pro.
-- Returns 'ok', 'already', 'no_account' (the email has no account yet), 'full', 'forbidden' or 'not_found'.
CREATE OR REPLACE FUNCTION public.grant_founder_pass(_application_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app record;
  _user_id uuid;
  _current timestamptz;
BEGIN
  IF NOT public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())) THEN
    RETURN 'forbidden';
  END IF;
  SELECT * INTO _app FROM public.founder_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF _app.status = 'approved' THEN RETURN 'already'; END IF;  -- never extend twice by a double click
  IF public.founder_spots_left() <= 0 THEN RETURN 'full'; END IF;

  SELECT id INTO _user_id FROM auth.users WHERE lower(email) = lower(_app.email) LIMIT 1;
  IF _user_id IS NULL THEN RETURN 'no_account'; END IF;

  SELECT pass_until INTO _current FROM public.user_subscriptions WHERE user_id = _user_id;
  IF FOUND THEN
    UPDATE public.user_subscriptions
    SET pass_tier = 'pro',
        pass_until = GREATEST(COALESCE(_current, now()), now()) + interval '365 days',
        updated_at = now()
    WHERE user_id = _user_id;
  ELSE
    INSERT INTO public.user_subscriptions (user_id, status, pass_tier, pass_until)
    VALUES (_user_id, 'free', 'pro', now() + interval '365 days');
  END IF;

  UPDATE public.founder_applications
  SET status = 'approved', approved_at = now()
  WHERE id = _application_id;
  RETURN 'ok';
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_founder_pass(uuid) TO authenticated;
