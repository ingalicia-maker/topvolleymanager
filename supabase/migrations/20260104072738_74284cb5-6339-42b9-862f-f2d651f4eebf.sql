-- Add player_returns field to track which players don't return by bus
-- This will be stored as a JSON object where keys are player IDs and values are booleans (false = no vuelve en bus)
ALTER TABLE public.events ADD COLUMN player_returns jsonb DEFAULT '{}'::jsonb;

-- Add selected_teams field for displacement events (multiple teams can participate)
ALTER TABLE public.events ADD COLUMN selected_teams text[] DEFAULT '{}'::text[];