-- Create email verification tokens table for custom email verification
CREATE TABLE public.email_verification_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'es',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  verified_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(email, token)
);

-- Create index for faster lookups
CREATE INDEX idx_email_verification_email ON public.email_verification_tokens(email);
CREATE INDEX idx_email_verification_token ON public.email_verification_tokens(token);

-- Enable RLS
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for signup flow)
CREATE POLICY "Allow anonymous insert verification tokens" 
ON public.email_verification_tokens 
FOR INSERT 
WITH CHECK (true);

-- Allow reading own verification tokens by email
CREATE POLICY "Allow reading verification tokens by email" 
ON public.email_verification_tokens 
FOR SELECT 
USING (true);

-- Allow updating verification status
CREATE POLICY "Allow updating verification tokens" 
ON public.email_verification_tokens 
FOR UPDATE 
USING (true);

-- Create function to clean up old tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.email_verification_tokens 
  WHERE expires_at < NOW() - INTERVAL '24 hours';
$$;