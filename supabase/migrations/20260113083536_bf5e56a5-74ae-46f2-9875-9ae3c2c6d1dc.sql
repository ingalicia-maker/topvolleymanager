-- Fix function search path warnings for trigger functions

CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS VARCHAR(6) 
LANGUAGE plpgsql 
VOLATILE
SET search_path = public
AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invitation_short_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code VARCHAR(6);
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := public.generate_short_code();
    IF NOT EXISTS (
      SELECT 1 FROM public.club_invitations 
      WHERE short_code = new_code 
      AND used_at IS NULL 
      AND expires_at > now()
    ) THEN
      NEW.short_code := new_code;
      EXIT;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique short code';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;