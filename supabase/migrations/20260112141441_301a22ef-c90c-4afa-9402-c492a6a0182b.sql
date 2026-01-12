-- Drop and recreate get_invitation_preview as security definer
DROP FUNCTION IF EXISTS public.get_invitation_preview(_token text);

CREATE OR REPLACE FUNCTION public.get_invitation_preview(_token text)
RETURNS TABLE (
  club_id uuid,
  club_name text,
  role text,
  responsibility_code text,
  responsible_person_name text,
  expires_at timestamptz,
  used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _token IS NULL OR length(trim(_token)) < 10 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.club_id,
    c.name AS club_name,
    i.role,
    c.responsibility_code,
    c.responsible_person_name,
    i.expires_at,
    i.used_at
  FROM public.club_invitations i
  JOIN public.clubs c ON c.id = i.club_id
  WHERE i.token = trim(_token)
  LIMIT 1;
END;
$$;

-- Drop and recreate accept_club_invitation as security definer
DROP FUNCTION IF EXISTS public.accept_club_invitation(_token text);

CREATE OR REPLACE FUNCTION public.accept_club_invitation(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.club_invitations%ROWTYPE;
  v_role text;
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF _token IS NULL OR length(trim(_token)) < 10 THEN
    RAISE EXCEPTION 'Invitación no válida o expirada';
  END IF;

  -- Lock the invitation row to avoid double-accept
  SELECT * INTO v_inv
  FROM public.club_invitations
  WHERE token = trim(_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no válida o expirada';
  END IF;

  IF v_inv.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invitación no válida o expirada';
  END IF;

  IF v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'La invitación ha expirado';
  END IF;

  v_role := v_inv.role;

  -- Avoid duplicates
  IF EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = v_inv.club_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Ya eres miembro de este club';
  END IF;

  -- Insert into club_members
  INSERT INTO public.club_members (club_id, user_id, role)
  VALUES (v_inv.club_id, v_uid, v_role);

  -- Keep user_roles in sync
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = v_role::app_role
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, v_role::app_role);
  END IF;

  -- Mark invitation as used
  UPDATE public.club_invitations
  SET used_at = now()
  WHERE id = v_inv.id;

  RETURN jsonb_build_object('success', true, 'club_id', v_inv.club_id, 'role', v_role);
END;
$$;