-- Fix RLS policy for conversations INSERT - correct argument order for user_belongs_to_club
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;

CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
WITH CHECK (
  created_by = auth.uid() 
  AND user_belongs_to_club(auth.uid(), club_id)
);