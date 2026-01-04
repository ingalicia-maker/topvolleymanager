-- Add displacement-specific fields to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS destination text,
ADD COLUMN IF NOT EXISTS departure_time time,
ADD COLUMN IF NOT EXISTS stops jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS player_stops jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS total_passengers integer DEFAULT 0;

-- The stops field will store array of enabled stops like ["Los Rosales", "Sagrada", "Os Carballos", "Alfonso Molina"]
-- The player_stops field will store a mapping of player_id to stop_name like {"player-uuid": "Los Rosales", ...}