-- Fix club creation returning row (INSERT ... SELECT) by allowing creators to SELECT their newly created club
DROP POLICY IF EXISTS "Users can view their clubs" ON public.clubs;
CREATE POLICY "Users can view their clubs"
ON public.clubs
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR user_belongs_to_club(auth.uid(), id)
);

-- Lock down email_verification_tokens: only backend functions (service role) should access it
DROP POLICY IF EXISTS "Allow anonymous insert verification tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Allow updating verification tokens" ON public.email_verification_tokens;
-- (This one may already be dropped)
DROP POLICY IF EXISTS "Allow reading verification tokens by email" ON public.email_verification_tokens;