-- Create table to track user registrations for admin monitoring
CREATE TABLE public.user_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    name TEXT,
    profile_type TEXT NOT NULL CHECK (profile_type IN ('director', 'coach')),
    club_name TEXT,
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    email_sent_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.user_registrations ENABLE ROW LEVEL SECURITY;

-- Only app admins can view and manage registrations
CREATE POLICY "App admins can view all registrations" 
ON public.user_registrations 
FOR SELECT 
USING (is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())::text));

CREATE POLICY "App admins can update registrations" 
ON public.user_registrations 
FOR UPDATE 
USING (is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())::text));

CREATE POLICY "App admins can delete registrations" 
ON public.user_registrations 
FOR DELETE 
USING (is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())::text));

-- Allow insert from edge functions (service role)
CREATE POLICY "Service role can insert registrations" 
ON public.user_registrations 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_user_registrations_registered_at ON public.user_registrations(registered_at DESC);
CREATE INDEX idx_user_registrations_profile_type ON public.user_registrations(profile_type);