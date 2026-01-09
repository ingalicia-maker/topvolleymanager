-- Add grace period fields to user_subscriptions table
ALTER TABLE public.user_subscriptions 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient grace period queries
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_grace_period 
ON public.user_subscriptions(grace_period_ends_at) 
WHERE grace_period_ends_at IS NOT NULL AND data_deleted_at IS NULL;

-- Function to set grace period when subscription is canceled
CREATE OR REPLACE FUNCTION public.set_subscription_grace_period()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to 'free' and was previously premium/vip
  IF NEW.status = 'free' AND OLD.status IN ('premium', 'vip') THEN
    NEW.canceled_at = NOW();
    NEW.grace_period_ends_at = NOW() + INTERVAL '7 days';
  END IF;
  
  -- If reactivating subscription, clear grace period
  IF NEW.status IN ('premium', 'vip') AND OLD.status = 'free' THEN
    NEW.canceled_at = NULL;
    NEW.grace_period_ends_at = NULL;
    NEW.data_deleted_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for grace period
DROP TRIGGER IF EXISTS trigger_subscription_grace_period ON public.user_subscriptions;
CREATE TRIGGER trigger_subscription_grace_period
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_subscription_grace_period();

-- Function to check if user is in grace period
CREATE OR REPLACE FUNCTION public.is_in_grace_period(_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  grace_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT grace_period_ends_at INTO grace_end
  FROM public.user_subscriptions
  WHERE user_id = _user_id
  AND grace_period_ends_at IS NOT NULL
  AND data_deleted_at IS NULL;
  
  IF grace_end IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN NOW() < grace_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get days remaining in grace period
CREATE OR REPLACE FUNCTION public.get_grace_period_days_remaining(_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  grace_end TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT grace_period_ends_at INTO grace_end
  FROM public.user_subscriptions
  WHERE user_id = _user_id
  AND grace_period_ends_at IS NOT NULL
  AND data_deleted_at IS NULL;
  
  IF grace_end IS NULL OR NOW() >= grace_end THEN
    RETURN 0;
  END IF;
  
  RETURN GREATEST(0, EXTRACT(DAY FROM (grace_end - NOW()))::INTEGER + 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;