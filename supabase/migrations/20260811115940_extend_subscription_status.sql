-- Extend subscription_status to match the plan tiers the app already expects
-- client-side (useSubscription.ts), so RevenueCat (native purchases) and a
-- future Stripe webhook can both write a precise tier instead of just
-- 'free' | 'premium' | 'vip'.
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'pro';
ALTER TYPE public.subscription_status ADD VALUE IF NOT EXISTS 'elite';
