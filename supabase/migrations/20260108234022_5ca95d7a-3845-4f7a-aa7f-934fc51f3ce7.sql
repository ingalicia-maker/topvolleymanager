-- Fix overly permissive RLS policy on user_subscriptions
-- Drop the permissive policy
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.user_subscriptions;

-- Create proper policies for user_subscriptions
CREATE POLICY "Users can insert own subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);