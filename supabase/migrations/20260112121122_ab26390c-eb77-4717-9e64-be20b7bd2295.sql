-- Fix argument order for helper functions used in RLS policies (they expect club_id/conversation_id first)

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;
CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
WITH CHECK (
  user_belongs_to_club(club_id, auth.uid())
  AND created_by = auth.uid()
);

-- Conversation participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (
  user_is_conversation_participant(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can add participants to conversations they created" ON public.conversation_participants;
CREATE POLICY "Users can add participants to conversations they created"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_participants.conversation_id
      AND c.created_by = auth.uid()
  )
);
