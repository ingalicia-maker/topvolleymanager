-- Tighten permissions that let users act outside their own club.

-- 1) Joining a club: only as the creator of a brand-new club. Everyone else joins through
--    accept_club_invitation / accept_club_invitation_by_code, which check the invitation.
DROP POLICY IF EXISTS "Authenticated users can join clubs" ON public.club_members;
DROP POLICY IF EXISTS "Club creators can add themselves to their new club" ON public.club_members;
CREATE POLICY "Club creators can add themselves to their new club"
ON public.club_members FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.clubs c WHERE c.id = club_id AND c.created_by = auth.uid())
  AND NOT EXISTS (SELECT 1 FROM public.club_members m WHERE m.club_id = club_members.club_id)
);

-- 2) Roles: a director only manages the coach role of people in their own club(s)
CREATE OR REPLACE FUNCTION public.shares_club_as_director(_director UUID, _user UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members d
    JOIN public.club_members m ON m.club_id = d.club_id
    WHERE d.user_id = _director AND d.role = 'director' AND m.user_id = _user
  )
$$;

DROP POLICY IF EXISTS "Directors can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Directors can manage coach roles in their club" ON public.user_roles;
CREATE POLICY "Directors can manage coach roles in their club"
ON public.user_roles FOR ALL TO authenticated
USING (role = 'coach' AND public.shares_club_as_director(auth.uid(), user_id))
WITH CHECK (role = 'coach' AND public.shares_club_as_director(auth.uid(), user_id));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.shares_club_as_director(auth.uid(), user_id));

-- 3) Club look (name, colours, logo): only the directors of that club
DROP POLICY IF EXISTS "Directors can insert club settings" ON public.club_settings;
DROP POLICY IF EXISTS "Directors can update club settings" ON public.club_settings;
CREATE POLICY "Directors can insert club settings"
ON public.club_settings FOR INSERT TO authenticated
WITH CHECK (public.is_club_director(auth.uid(), id));
CREATE POLICY "Directors can update club settings"
ON public.club_settings FOR UPDATE TO authenticated
USING (public.is_club_director(auth.uid(), id))
WITH CHECK (public.is_club_director(auth.uid(), id));

-- 4) Invitations: coaches may invite coaches; only directors may invite directors
DROP POLICY IF EXISTS "Club directors can create invitations" ON public.club_invitations;
CREATE POLICY "Club directors can create invitations"
ON public.club_invitations FOR INSERT TO authenticated
WITH CHECK (
  public.is_club_director(auth.uid(), club_id)
  OR (public.user_belongs_to_club(auth.uid(), club_id) AND role = 'coach')
);

-- 5) Creating a club: always in your own name
DROP POLICY IF EXISTS "Authenticated users can create clubs" ON public.clubs;
CREATE POLICY "Authenticated users can create clubs"
ON public.clubs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Check: memberships that look suspicious (directors of clubs they did not create and
-- with no used invitation). Review the list before deciding anything.
SELECT c.name AS club, u.email, m.role, m.joined_at
FROM public.club_members m
JOIN public.clubs c ON c.id = m.club_id
JOIN auth.users u ON u.id = m.user_id
WHERE m.role = 'director'
  AND c.created_by IS DISTINCT FROM m.user_id
  AND NOT EXISTS (
    SELECT 1 FROM public.club_invitations i
    WHERE i.club_id = m.club_id AND i.role = 'director' AND i.used_at IS NOT NULL
  )
ORDER BY m.joined_at DESC;
