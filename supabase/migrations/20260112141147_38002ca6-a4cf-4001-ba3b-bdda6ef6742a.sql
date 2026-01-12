-- Allow invited coaches to preview and accept invitations without exposing the whole invitations table

-- 1) Preview invitation (club name + responsibility code) by token
create or replace function public.get_invitation_preview(_token text)
returns table (
  club_id uuid,
  club_name text,
  role text,
  responsibility_code text,
  responsible_person_name text,
  expires_at timestamptz,
  used_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if _token is null or length(trim(_token)) < 10 then
    return;
  end if;

  return query
  select
    i.club_id,
    c.name as club_name,
    i.role,
    c.responsibility_code,
    c.responsible_person_name,
    i.expires_at,
    i.used_at
  from public.club_invitations i
  join public.clubs c on c.id = i.club_id
  where i.token = trim(_token)
  limit 1;
end;
$$;

-- 2) Accept invitation by token (join club + assign role + consume invitation)
create or replace function public.accept_club_invitation(_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.club_invitations%rowtype;
  v_role text;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  if _token is null or length(trim(_token)) < 10 then
    raise exception 'Invitación no válida o expirada';
  end if;

  -- Lock the invitation row to avoid double-accept
  select * into v_inv
  from public.club_invitations
  where token = trim(_token)
  for update;

  if not found then
    raise exception 'Invitación no válida o expirada';
  end if;

  if v_inv.used_at is not null then
    raise exception 'Invitación no válida o expirada';
  end if;

  if v_inv.expires_at < now() then
    raise exception 'La invitación ha expirado';
  end if;

  v_role := v_inv.role;

  -- Avoid duplicates
  if exists (
    select 1 from public.club_members
    where club_id = v_inv.club_id and user_id = v_uid
  ) then
    raise exception 'Ya eres miembro de este club';
  end if;

  insert into public.club_members (club_id, user_id, role)
  values (v_inv.club_id, v_uid, v_role);

  -- Keep user_roles in sync
  if not exists (
    select 1 from public.user_roles
    where user_id = v_uid and role = v_role::app_role
  ) then
    insert into public.user_roles (user_id, role)
    values (v_uid, v_role::app_role);
  end if;

  update public.club_invitations
  set used_at = now()
  where id = v_inv.id;

  return jsonb_build_object('success', true, 'club_id', v_inv.club_id, 'role', v_role);
end;
$$;

-- Permissions
revoke all on function public.get_invitation_preview(text) from public;
grant execute on function public.get_invitation_preview(text) to authenticated;

revoke all on function public.accept_club_invitation(text) from public;
grant execute on function public.accept_club_invitation(text) to authenticated;
