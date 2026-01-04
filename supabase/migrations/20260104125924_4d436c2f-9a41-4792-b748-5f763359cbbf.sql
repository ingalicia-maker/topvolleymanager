-- Allow displacement events in events.type
ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_type_check
  CHECK (type IN ('training', 'match', 'displacement'));