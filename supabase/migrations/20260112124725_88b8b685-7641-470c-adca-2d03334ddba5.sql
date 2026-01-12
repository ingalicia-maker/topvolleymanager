-- Simplify the INSERT policy without relying on the helper function
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;

CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE club_members.user_id = auth.uid() 
    AND club_members.club_id = conversations.club_id
  )
);
