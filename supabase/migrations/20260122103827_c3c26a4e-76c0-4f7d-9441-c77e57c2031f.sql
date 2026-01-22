-- Add opponent column for match events
ALTER TABLE public.events 
ADD COLUMN opponent TEXT NULL;