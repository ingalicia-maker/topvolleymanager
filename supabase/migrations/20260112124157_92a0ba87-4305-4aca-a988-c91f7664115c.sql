-- Fix conversations INSERT RLS: correct argument order for helper
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;

CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND user_belongs_to_club(club_id, auth.uid())
);
