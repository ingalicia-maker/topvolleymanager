-- Create trigger to track new user registrations
CREATE OR REPLACE FUNCTION public.track_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_type TEXT;
  v_club_name TEXT;
BEGIN
  -- Determine if director or coach
  IF (NEW.raw_user_meta_data ->> 'is_director')::boolean = true THEN
    v_profile_type := 'director';
  ELSE
    v_profile_type := 'coach';
  END IF;

  -- Insert registration record
  INSERT INTO public.user_registrations (
    user_id,
    email,
    name,
    profile_type,
    registered_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    v_profile_type,
    NEW.created_at
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users (only if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_track_registration ON auth.users;
CREATE TRIGGER on_auth_user_created_track_registration
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.track_new_user_registration();

-- Add unique constraint on user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_registrations_user_id_key'
  ) THEN
    ALTER TABLE public.user_registrations ADD CONSTRAINT user_registrations_user_id_key UNIQUE (user_id);
  END IF;
END $$;