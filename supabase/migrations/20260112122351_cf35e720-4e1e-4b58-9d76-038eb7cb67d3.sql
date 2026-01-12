-- Replace helper-function-based membership check with direct EXISTS to avoid any auth context issues

DROP POLICY IF EXISTS "Users can create conversations in their club" ON public.conversations;
CREATE POLICY "Users can create conversations in their club"
ON public.conversations
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.club_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.club_id = conversations.club_id
  )
);
