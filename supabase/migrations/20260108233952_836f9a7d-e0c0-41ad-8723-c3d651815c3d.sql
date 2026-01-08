-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('free', 'premium', 'vip');

-- Create user subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status subscription_status NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily credits tracking table
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_remaining INTEGER NOT NULL DEFAULT 5,
  credits_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, credits_date)
);

-- Create VIP users table (managed by admin)
CREATE TABLE public.vip_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create app admins table (for super admin access)
CREATE TABLE public.app_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial admin
INSERT INTO public.app_admins (email) VALUES ('versace.antonino@gmail.com');

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is app admin
CREATE OR REPLACE FUNCTION public.is_app_admin(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins WHERE LOWER(email) = LOWER(_email)
  )
$$;

-- Create function to check if user is VIP
CREATE OR REPLACE FUNCTION public.is_vip_user(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vip_users WHERE LOWER(email) = LOWER(_email)
  )
$$;

-- Create function to get or create today's credits
CREATE OR REPLACE FUNCTION public.get_user_credits(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _credits INTEGER;
BEGIN
  -- Try to get today's credits
  SELECT credits_remaining INTO _credits
  FROM public.user_credits
  WHERE user_id = _user_id AND credits_date = CURRENT_DATE;
  
  -- If no record exists, create one with 5 credits
  IF _credits IS NULL THEN
    INSERT INTO public.user_credits (user_id, credits_remaining, credits_date)
    VALUES (_user_id, 5, CURRENT_DATE)
    ON CONFLICT (user_id, credits_date) DO NOTHING
    RETURNING credits_remaining INTO _credits;
    
    IF _credits IS NULL THEN
      SELECT credits_remaining INTO _credits
      FROM public.user_credits
      WHERE user_id = _user_id AND credits_date = CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN COALESCE(_credits, 5);
END;
$$;

-- Create function to consume a credit
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _credits INTEGER;
  _status subscription_status;
  _user_email TEXT;
BEGIN
  -- Get user email
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  -- Check if VIP or admin (unlimited credits)
  IF public.is_vip_user(_user_email) OR public.is_app_admin(_user_email) THEN
    RETURN TRUE;
  END IF;
  
  -- Check subscription status
  SELECT status INTO _status FROM public.user_subscriptions WHERE user_id = _user_id;
  
  -- Premium users have unlimited credits
  IF _status = 'premium' OR _status = 'vip' THEN
    RETURN TRUE;
  END IF;
  
  -- Ensure today's credits exist
  PERFORM public.get_user_credits(_user_id);
  
  -- Try to consume a credit
  UPDATE public.user_credits
  SET credits_remaining = credits_remaining - 1
  WHERE user_id = _user_id 
    AND credits_date = CURRENT_DATE 
    AND credits_remaining > 0;
  
  RETURN FOUND;
END;
$$;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
ON public.user_subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for user_credits
CREATE POLICY "Users can view own credits"
ON public.user_credits FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policies for vip_users (only app admins can manage)
CREATE POLICY "Anyone can check VIP status"
ON public.vip_users FOR SELECT
USING (true);

CREATE POLICY "App admins can manage VIP users"
ON public.vip_users FOR ALL
USING (public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())));

-- RLS Policies for app_admins
CREATE POLICY "Anyone can check admin status"
ON public.app_admins FOR SELECT
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create subscription for existing users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _status subscription_status;
BEGIN
  -- Check if user is VIP or admin
  IF public.is_vip_user(NEW.email) OR public.is_app_admin(NEW.email) THEN
    _status := 'vip';
  ELSE
    _status := 'free';
  END IF;
  
  INSERT INTO public.user_subscriptions (user_id, status)
  VALUES (NEW.id, _status);
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user subscriptions
CREATE TRIGGER on_auth_user_created_subscription
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_subscription();