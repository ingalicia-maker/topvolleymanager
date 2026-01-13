-- Add short_code column to club_invitations for simple code-based joining
ALTER TABLE public.club_invitations 
ADD COLUMN IF NOT EXISTS short_code VARCHAR(6);

-- Create unique index for short_code lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_invitations_short_code 
ON public.club_invitations(short_code) 
WHERE short_code IS NOT NULL AND used_at IS NULL;

-- Function to generate random 6-character alphanumeric code (uppercase)
CREATE OR REPLACE FUNCTION public.generate_short_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars like 0/O, 1/I/L
  result VARCHAR := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger to auto-generate short_code on insert
CREATE OR REPLACE FUNCTION public.set_invitation_short_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code VARCHAR(6);
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := public.generate_short_code();
    -- Check if code already exists for an active invitation
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
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS set_invitation_short_code_trigger ON public.club_invitations;
CREATE TRIGGER set_invitation_short_code_trigger
BEFORE INSERT ON public.club_invitations
FOR EACH ROW
WHEN (NEW.short_code IS NULL)
EXECUTE FUNCTION public.set_invitation_short_code();

-- Function to accept invitation by short code (for new users)
CREATE OR REPLACE FUNCTION public.accept_club_invitation_by_code(_code VARCHAR)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_existing_membership UUID;
  v_member_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No autenticado');
  END IF;

  -- Find invitation by short_code (case-insensitive)
  SELECT * INTO v_invitation
  FROM public.club_invitations
  WHERE UPPER(short_code) = UPPER(_code)
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF v_invitation IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código no válido o expirado');
  END IF;

  -- Check if already a member
  SELECT id INTO v_existing_membership
  FROM public.club_members
  WHERE club_id = v_invitation.club_id AND user_id = v_user_id;

  IF v_existing_membership IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Ya eres miembro de este club');
  END IF;

  -- Add user to club
  v_member_role := v_invitation.role;
  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (v_invitation.club_id, v_user_id, v_member_role);

  -- Add to user_roles if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, v_member_role::app_role)
  ON CONFLICT DO NOTHING;

  -- Mark invitation as used
  UPDATE public.club_invitations
  SET used_at = now()
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true, 
    'club_id', v_invitation.club_id,
    'role', v_member_role
  );
END;
$$;

-- Function to get invitation preview by short code
CREATE OR REPLACE FUNCTION public.get_invitation_preview_by_code(_code VARCHAR)
RETURNS TABLE (
  club_id UUID,
  club_name TEXT,
  expires_at TIMESTAMPTZ,
  responsibility_code TEXT,
  responsible_person_name TEXT,
  role TEXT,
  used_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.club_id,
    c.name::TEXT as club_name,
    i.expires_at,
    c.responsibility_code::TEXT,
    c.responsible_person_name::TEXT,
    i.role::TEXT,
    i.used_at
  FROM public.club_invitations i
  JOIN public.clubs c ON c.id = i.club_id
  WHERE UPPER(i.short_code) = UPPER(_code)
  LIMIT 1;
END;
$$;

-- Generate short codes for existing invitations that don't have one
UPDATE public.club_invitations
SET short_code = public.generate_short_code()
WHERE short_code IS NULL;