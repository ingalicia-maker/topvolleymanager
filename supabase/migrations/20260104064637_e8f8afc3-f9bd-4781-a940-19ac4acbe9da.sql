-- Add new columns to players table
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS surname1 text,
ADD COLUMN IF NOT EXISTS surname2 text,
ADD COLUMN IF NOT EXISTS birth_year integer,
ADD COLUMN IF NOT EXISTS height integer;

-- Create teams table for dynamic team management
CREATE TABLE public.teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  coach text NOT NULL,
  color text NOT NULL DEFAULT 'hsl(221, 83%, 53%)',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on teams
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams - all authenticated users can view
CREATE POLICY "Authenticated users can view all teams"
ON public.teams FOR SELECT
TO authenticated
USING (true);

-- Directors can manage all teams
CREATE POLICY "Directors can manage all teams"
ON public.teams FOR ALL
TO authenticated
USING (is_director(auth.uid()))
WITH CHECK (is_director(auth.uid()));

-- Coaches can create teams
CREATE POLICY "Coaches can create teams"
ON public.teams FOR INSERT
TO authenticated
WITH CHECK (true);

-- Coaches can update their own teams
CREATE POLICY "Coaches can update teams they coach"
ON public.teams FOR UPDATE
TO authenticated
USING (true);

-- Insert default teams
INSERT INTO public.teams (id, name, coach, color) VALUES
  ('infantil-a', 'Infantil A', 'Luismi', 'hsl(25, 95%, 53%)'),
  ('cadete-b', 'Cadete B', 'Carla', 'hsl(262, 83%, 58%)'),
  ('cadete-a', 'Cadete A', 'Nino', 'hsl(142, 76%, 36%)'),
  ('juvenil-a', 'Juvenil A', 'Charly', 'hsl(199, 89%, 48%)'),
  ('junior', 'Junior', 'Charly', 'hsl(350, 89%, 60%)'),
  ('primera-nacional', 'Primera Nacional', 'Charly', 'hsl(45, 93%, 47%)')
ON CONFLICT (id) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();