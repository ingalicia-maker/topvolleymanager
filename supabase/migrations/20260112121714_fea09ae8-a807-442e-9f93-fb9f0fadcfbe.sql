-- Fix RLS policies to match actual helper function signatures
-- user_belongs_to_club(_user_id, _club_id)
-- user_is_conversation_participant(_user_id, _conversation_id)

-- Conversations
DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;
CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
WITH CHECK (
  user_belongs_to_club(auth.uid(), club_id)
  AND created_by = auth.uid()
);

-- Conversation participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  user_is_conversation_participant(auth.uid(), conversation_id)
);
