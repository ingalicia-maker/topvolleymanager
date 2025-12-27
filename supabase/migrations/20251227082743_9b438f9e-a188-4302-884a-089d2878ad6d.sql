-- Add team_id column to ausencias table
ALTER TABLE public.ausencias 
ADD COLUMN team_id text NOT NULL DEFAULT 'cadete-a';

-- Remove the default after adding
ALTER TABLE public.ausencias 
ALTER COLUMN team_id DROP DEFAULT;

-- Create index for faster queries by team and date
CREATE INDEX idx_ausencias_team_date ON public.ausencias(team_id, date);

-- Create index for player + team + date queries (to check if already marked absent)
CREATE INDEX idx_ausencias_player_team_date ON public.ausencias(player_id, team_id, date);