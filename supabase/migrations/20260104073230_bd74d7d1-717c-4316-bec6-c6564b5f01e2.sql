-- Add field to track which coaches have submitted their player lists
-- Keys are team IDs, values are objects with coach_id, submitted_at, and submitted boolean
ALTER TABLE public.events ADD COLUMN coach_submissions jsonb DEFAULT '{}'::jsonb;