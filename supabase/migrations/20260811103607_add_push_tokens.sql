-- Native push notification device tokens (FCM), replacing the unused Web Push
-- placeholder in push_subscriptions. One row per device the user has registered.
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
ON public.push_tokens
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
ON public.push_tokens
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
ON public.push_tokens
FOR DELETE
USING (auth.uid() = user_id);
