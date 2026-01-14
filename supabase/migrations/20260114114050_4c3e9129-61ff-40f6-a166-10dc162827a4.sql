-- Add new fields for recurring events and keep_forever option
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS keep_forever boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_pattern text DEFAULT null,
ADD COLUMN IF NOT EXISTS recurring_end_date date DEFAULT null,
ADD COLUMN IF NOT EXISTS parent_event_id uuid DEFAULT null REFERENCES public.events(id) ON DELETE SET NULL;

-- Create index for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_keep_forever ON public.events(keep_forever) WHERE keep_forever = false;

-- Enable pg_cron and pg_net extensions for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA public;

-- Create function to delete old events (30+ days since creation and not keep_forever)
CREATE OR REPLACE FUNCTION public.cleanup_old_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.events
  WHERE keep_forever = false
    AND created_at < (NOW() - INTERVAL '30 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Schedule the cleanup to run daily at 3:00 AM
SELECT cron.schedule(
  'cleanup-old-events-daily',
  '0 3 * * *',
  'SELECT public.cleanup_old_events();'
);