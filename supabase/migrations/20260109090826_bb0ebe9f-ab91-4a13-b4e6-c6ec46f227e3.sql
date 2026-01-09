-- Add height measurement date to players table
ALTER TABLE public.players 
ADD COLUMN height_measured_at TEXT;