-- Fix the INSERT policy with correct parameter order
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;

CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
WITH CHECK (user_belongs_to_club(auth.uid(), club_id) AND created_by = auth.uid());

-- Add UPDATE policy for conversation creators and participants
CREATE POLICY "Users can update conversations they participate in"
ON public.conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);