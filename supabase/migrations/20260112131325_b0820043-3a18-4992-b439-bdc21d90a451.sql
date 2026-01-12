-- Fix conversations INSERT RLS: use SECURITY DEFINER membership helper to avoid RLS-blocked EXISTS

DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;

CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.user_belongs_to_club(auth.uid(), club_id)
);
