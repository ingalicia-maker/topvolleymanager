-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('coach', 'director');

-- Create enum for absence type
CREATE TYPE public.absence_type AS ENUM ('justified', 'unjustified');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is director
CREATE OR REPLACE FUNCTION public.is_director(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'director')
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_director(auth.uid()));

CREATE POLICY "Directors can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_director(auth.uid()))
WITH CHECK (public.is_director(auth.uid()));

-- Add absence_type column to ausencias
ALTER TABLE public.ausencias 
ADD COLUMN absence_type absence_type NOT NULL DEFAULT 'unjustified';

-- Create player_ratings table
CREATE TABLE public.player_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
    team_id TEXT NOT NULL,
    rated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    rating_date DATE NOT NULL DEFAULT CURRENT_DATE,
    effort_attitude SMALLINT NOT NULL CHECK (effort_attitude >= 1 AND effort_attitude <= 5),
    communication_cooperation SMALLINT NOT NULL CHECK (communication_cooperation >= 1 AND communication_cooperation <= 5),
    technical_execution SMALLINT NOT NULL CHECK (technical_execution >= 1 AND technical_execution <= 5),
    decision_making SMALLINT NOT NULL CHECK (decision_making >= 1 AND decision_making <= 5),
    leadership_initiative SMALLINT NOT NULL CHECK (leadership_initiative >= 1 AND leadership_initiative <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on player_ratings
ALTER TABLE public.player_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_ratings
CREATE POLICY "Authenticated users can view ratings"
ON public.player_ratings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Coaches can create ratings for their teams"
ON public.player_ratings
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Directors can manage all ratings"
ON public.player_ratings
FOR ALL
TO authenticated
USING (public.is_director(auth.uid()))
WITH CHECK (public.is_director(auth.uid()));

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    related_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid());

CREATE POLICY "Authenticated users can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_player_ratings_player_date ON public.player_ratings(player_id, rating_date);
CREATE INDEX idx_player_ratings_team_date ON public.player_ratings(team_id, rating_date);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX idx_ausencias_type ON public.ausencias(absence_type);