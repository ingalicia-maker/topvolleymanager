-- Fix conversations INSERT RLS: align with actual helper signature user_belongs_to_club(user_id, club_id)
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;

CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND user_belongs_to_club(auth.uid(), club_id)
);
