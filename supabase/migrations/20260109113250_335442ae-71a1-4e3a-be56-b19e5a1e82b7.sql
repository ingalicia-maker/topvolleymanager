-- Phase 1: Critical Fixes

-- 1. Email Verification Tokens - Remove SELECT access (verification is handled server-side)
DROP POLICY IF EXISTS "Allow reading verification tokens by email" ON public.email_verification_tokens;

-- 2. Profiles - Restrict to same-club visibility
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their club"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.club_members cm1
    JOIN public.club_members cm2 ON cm1.club_id = cm2.club_id
    WHERE cm1.user_id = auth.uid() AND cm2.user_id = profiles.id
  )
);

-- 3. VIP Users - Only check own status
DROP POLICY IF EXISTS "Anyone can check VIP status" ON public.vip_users;
CREATE POLICY "Users can check their own VIP status"
ON public.vip_users FOR SELECT TO authenticated
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));

-- 4. App Admins - Only check own status
DROP POLICY IF EXISTS "Authenticated users can check admin status" ON public.app_admins;
CREATE POLICY "Users can check their own admin status"
ON public.app_admins FOR SELECT TO authenticated
USING (LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid())));

-- 5. Club Invitations - Restrict visibility
DROP POLICY IF EXISTS "Club members can view invitations" ON public.club_invitations;
CREATE POLICY "Authorized users can view invitations"
ON public.club_invitations FOR SELECT TO authenticated
USING (
  is_club_director(auth.uid(), club_id) OR
  created_by = auth.uid() OR
  LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- 6. Notifications - Restrict INSERT
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Users can create notifications as themselves"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() OR sender_id IS NULL);

-- Phase 2: Warning Fixes

-- 7. Player Ratings - Add UPDATE policy for coaches
CREATE POLICY "Coaches can update their own ratings"
ON public.player_ratings FOR UPDATE TO authenticated
USING (rated_by = auth.uid() AND ((club_id IS NULL) OR user_belongs_to_club(auth.uid(), club_id)))
WITH CHECK (rated_by = auth.uid() AND ((club_id IS NULL) OR user_belongs_to_club(auth.uid(), club_id)));

-- Phase 3: Improvements

-- 8. Teams - Add DELETE policy for directors
CREATE POLICY "Club directors can delete teams"
ON public.teams FOR DELETE TO authenticated
USING ((club_id IS NULL) OR is_club_director(auth.uid(), club_id));

-- 9. Club Members - Add UPDATE policy for directors
CREATE POLICY "Club directors can update members"
ON public.club_members FOR UPDATE TO authenticated
USING (is_club_director(auth.uid(), club_id))
WITH CHECK (is_club_director(auth.uid(), club_id));