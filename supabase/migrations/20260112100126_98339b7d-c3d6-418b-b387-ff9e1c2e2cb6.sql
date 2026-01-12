-- Drop existing policies on club_invitations that reference auth.users
DROP POLICY IF EXISTS "Authorized users can view invitations" ON public.club_invitations;
DROP POLICY IF EXISTS "Invited users can update invitation" ON public.club_invitations;

-- Recreate policies using auth.email() instead of subquery to auth.users
CREATE POLICY "Authorized users can view invitations" 
ON public.club_invitations 
FOR SELECT 
USING (
  is_club_director(auth.uid(), club_id) 
  OR (created_by = auth.uid()) 
  OR (lower(email) = lower(auth.email()))
);

CREATE POLICY "Invited users can update invitation" 
ON public.club_invitations 
FOR UPDATE 
USING (
  (lower(email) = lower(auth.email())) 
  OR is_club_director(auth.uid(), club_id)
)
WITH CHECK (
  (lower(email) = lower(auth.email())) 
  OR is_club_director(auth.uid(), club_id)
);

-- Also fix the app_admins policy that has the same issue
DROP POLICY IF EXISTS "Users can check their own admin status" ON public.app_admins;

CREATE POLICY "Users can check their own admin status" 
ON public.app_admins 
FOR SELECT 
USING (lower(email) = lower(auth.email()));