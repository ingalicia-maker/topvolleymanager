-- Fix RLS argument order issues that block messaging

-- Conversations: INSERT policy must call user_belongs_to_club(club_id, auth.uid())
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;
CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND user_belongs_to_club(club_id, auth.uid())
);

-- Conversation participants: SELECT policy must call user_is_conversation_participant(conversation_id, auth.uid())
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
TO public
USING (
  user_is_conversation_participant(conversation_id, auth.uid())
);