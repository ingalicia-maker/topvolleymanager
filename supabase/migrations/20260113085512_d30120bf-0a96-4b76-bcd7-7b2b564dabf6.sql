-- Fix conversation_participants SELECT policy (correct argument order)
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants of their conversations"
ON public.conversation_participants
FOR SELECT
USING (user_is_conversation_participant(auth.uid(), conversation_id));

-- Fix conversations SELECT policy (allow creator to read immediately after insert)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
ON public.conversations
FOR SELECT
USING (
  created_by = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
);