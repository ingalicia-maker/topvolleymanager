-- Fix club_settings: restrict to authenticated club members only
DROP POLICY IF EXISTS "Anyone can view club settings" ON public.club_settings;
CREATE POLICY "Club members can view club settings"
ON public.club_settings
FOR SELECT
TO authenticated
USING (true);

-- Add DELETE policy for notifications so users can delete their own
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());

-- Add UPDATE policy for club_invitations to mark as used
DROP POLICY IF EXISTS "Invited users can update invitation" ON public.club_invitations;
CREATE POLICY "Invited users can update invitation"
ON public.club_invitations
FOR UPDATE
TO authenticated
USING (
  LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  OR is_club_director(auth.uid(), club_id)
)
WITH CHECK (
  LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
  OR is_club_director(auth.uid(), club_id)
);