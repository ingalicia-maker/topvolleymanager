-- Functions must not resolve tables through the caller's search_path.
-- The email queue functions already use qualified names (pgmq.*, public.*).
ALTER FUNCTION public.enqueue_email(TEXT, JSONB) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(TEXT, INT, INT) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(TEXT, BIGINT) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) SET search_path = public, pgmq;
ALTER FUNCTION public.set_subscription_grace_period() SET search_path = public;
ALTER FUNCTION public.is_in_grace_period(UUID) SET search_path = public;
ALTER FUNCTION public.get_grace_period_days_remaining(UUID) SET search_path = public;
ALTER FUNCTION public.fee_text(TEXT, TEXT) SET search_path = public;

-- Check: functions in public still without a fixed search_path (should be none)
SELECT p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
ORDER BY 1;
