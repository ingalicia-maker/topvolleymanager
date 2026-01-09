-- Add additional measurements to players table
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS additional_measurements jsonb DEFAULT '[]'::jsonb;

-- Add phone type fields
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS phone_type text DEFAULT 'player';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS phone2 text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS phone2_type text;

-- Add gender to teams table
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS gender text DEFAULT 'female';

-- Add comment to explain the structure
COMMENT ON COLUMN public.players.additional_measurements IS 'Array of {type: string, value: string, measured_at: string}';