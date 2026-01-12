-- Address linter: RLS enabled but no policies on email_verification_tokens
-- This table should not be directly accessible from client roles.
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all access" ON public.email_verification_tokens;
CREATE POLICY "Deny all access"
ON public.email_verification_tokens
FOR ALL
USING (false)
WITH CHECK (false);
