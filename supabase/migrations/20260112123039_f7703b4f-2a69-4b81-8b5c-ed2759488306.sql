-- Fix conversations INSERT RLS to use security-definer helper directly
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;

CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
TO public
WITH CHECK (
  created_by = auth.uid()
  AND user_belongs_to_club(auth.uid(), club_id)
);
