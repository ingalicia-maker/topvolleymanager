-- Create clubs table
CREATE TABLE public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Mi Club',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '221 83% 53%',
  accent_color TEXT NOT NULL DEFAULT '25 95% 53%',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create club_invitations table for invitation links
CREATE TABLE public.club_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role TEXT NOT NULL DEFAULT 'coach' CHECK (role IN ('coach', 'director')),
  email TEXT,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create club_members table to link users to clubs
CREATE TABLE public.club_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'coach' CHECK (role IN ('coach', 'director')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(club_id, user_id)
);

-- Add club_id to existing tables
ALTER TABLE public.teams ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.players ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.events ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.ausencias ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.player_ratings ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.stops ADD COLUMN club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;

-- Function to get user's club_id
CREATE OR REPLACE FUNCTION public.get_user_club_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT club_id FROM public.club_members WHERE user_id = _user_id LIMIT 1
$$;

-- Function to check if user belongs to a club
CREATE OR REPLACE FUNCTION public.user_belongs_to_club(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE user_id = _user_id AND club_id = _club_id
  )
$$;

-- Function to check if user is club director
CREATE OR REPLACE FUNCTION public.is_club_director(_user_id UUID, _club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE user_id = _user_id AND club_id = _club_id AND role = 'director'
  )
$$;

-- RLS Policies for clubs
CREATE POLICY "Users can view their clubs"
ON public.clubs FOR SELECT
USING (public.user_belongs_to_club(auth.uid(), id));

CREATE POLICY "Authenticated users can create clubs"
ON public.clubs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Club directors can update their club"
ON public.clubs FOR UPDATE
USING (public.is_club_director(auth.uid(), id));

-- RLS Policies for club_members
CREATE POLICY "Users can view members of their clubs"
ON public.club_members FOR SELECT
USING (public.user_belongs_to_club(auth.uid(), club_id));

CREATE POLICY "Authenticated users can join clubs"
ON public.club_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Club directors can manage members"
ON public.club_members FOR DELETE
USING (public.is_club_director(auth.uid(), club_id));

-- RLS Policies for club_invitations
CREATE POLICY "Club members can view invitations"
ON public.club_invitations FOR SELECT
USING (public.user_belongs_to_club(auth.uid(), club_id) OR used_at IS NULL);

CREATE POLICY "Club directors can create invitations"
ON public.club_invitations FOR INSERT
WITH CHECK (public.is_club_director(auth.uid(), club_id) OR public.user_belongs_to_club(auth.uid(), club_id));

CREATE POLICY "Club directors can delete invitations"
ON public.club_invitations FOR DELETE
USING (public.is_club_director(auth.uid(), club_id));

-- Update existing table RLS policies to include club isolation

-- Teams: users can only see teams from their club
DROP POLICY IF EXISTS "Authenticated users can view all teams" ON public.teams;
CREATE POLICY "Users can view teams from their club"
ON public.teams FOR SELECT
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Coaches can create teams" ON public.teams;
CREATE POLICY "Club members can create teams"
ON public.teams FOR INSERT
WITH CHECK (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Coaches can update teams they coach" ON public.teams;
CREATE POLICY "Club members can update teams"
ON public.teams FOR UPDATE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Directors can manage all teams" ON public.teams;

-- Players: users can only see players from their club
DROP POLICY IF EXISTS "Authenticated users can view all players" ON public.players;
CREATE POLICY "Users can view players from their club"
ON public.players FOR SELECT
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can insert players" ON public.players;
CREATE POLICY "Club members can create players"
ON public.players FOR INSERT
WITH CHECK (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can update players" ON public.players;
CREATE POLICY "Club members can update players"
ON public.players FOR UPDATE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can delete players" ON public.players;
CREATE POLICY "Club members can delete players"
ON public.players FOR DELETE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

-- Events: users can only see events from their club
DROP POLICY IF EXISTS "Authenticated users can view all events" ON public.events;
CREATE POLICY "Users can view events from their club"
ON public.events FOR SELECT
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Club members can create events"
ON public.events FOR INSERT
WITH CHECK (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
CREATE POLICY "Club members can update events"
ON public.events FOR UPDATE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;
CREATE POLICY "Club members can delete events"
ON public.events FOR DELETE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

-- Ausencias: users can only see ausencias from their club
DROP POLICY IF EXISTS "Authenticated users can view all ausencias" ON public.ausencias;
CREATE POLICY "Users can view ausencias from their club"
ON public.ausencias FOR SELECT
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can create ausencias" ON public.ausencias;
CREATE POLICY "Club members can create ausencias"
ON public.ausencias FOR INSERT
WITH CHECK (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can update ausencias" ON public.ausencias;
CREATE POLICY "Club members can update ausencias"
ON public.ausencias FOR UPDATE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can delete ausencias" ON public.ausencias;
CREATE POLICY "Club members can delete ausencias"
ON public.ausencias FOR DELETE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

-- Player ratings: users can only see ratings from their club
DROP POLICY IF EXISTS "Authenticated users can view ratings" ON public.player_ratings;
CREATE POLICY "Users can view ratings from their club"
ON public.player_ratings FOR SELECT
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Coaches can create ratings for their teams" ON public.player_ratings;
CREATE POLICY "Club members can create ratings"
ON public.player_ratings FOR INSERT
WITH CHECK (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Directors can manage all ratings" ON public.player_ratings;
CREATE POLICY "Club directors can manage ratings"
ON public.player_ratings FOR ALL
USING (club_id IS NULL OR public.is_club_director(auth.uid(), club_id));

-- Stops: users can only see stops from their club
DROP POLICY IF EXISTS "Authenticated users can view stops" ON public.stops;
CREATE POLICY "Users can view stops from their club"
ON public.stops FOR SELECT
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can create stops" ON public.stops;
CREATE POLICY "Club members can create stops"
ON public.stops FOR INSERT
WITH CHECK (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can update stops" ON public.stops;
CREATE POLICY "Club members can update stops"
ON public.stops FOR UPDATE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Authenticated users can delete stops" ON public.stops;
CREATE POLICY "Club members can delete stops"
ON public.stops FOR DELETE
USING (club_id IS NULL OR public.user_belongs_to_club(auth.uid(), club_id));

-- Create indexes for performance
CREATE INDEX idx_club_members_user_id ON public.club_members(user_id);
CREATE INDEX idx_club_members_club_id ON public.club_members(club_id);
CREATE INDEX idx_club_invitations_token ON public.club_invitations(token);
CREATE INDEX idx_teams_club_id ON public.teams(club_id);
CREATE INDEX idx_players_club_id ON public.players(club_id);
CREATE INDEX idx_events_club_id ON public.events(club_id);
CREATE INDEX idx_ausencias_club_id ON public.ausencias(club_id);
CREATE INDEX idx_player_ratings_club_id ON public.player_ratings(club_id);
CREATE INDEX idx_stops_club_id ON public.stops(club_id);