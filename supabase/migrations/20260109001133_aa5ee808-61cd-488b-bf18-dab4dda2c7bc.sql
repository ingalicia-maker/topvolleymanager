-- Create seasons table
CREATE TABLE public.seasons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Create policies for seasons
CREATE POLICY "Users can view seasons from their club" 
ON public.seasons 
FOR SELECT 
USING ((club_id IS NULL) OR user_belongs_to_club(auth.uid(), club_id));

CREATE POLICY "Club directors can create seasons" 
ON public.seasons 
FOR INSERT 
WITH CHECK ((club_id IS NULL) OR is_club_director(auth.uid(), club_id));

CREATE POLICY "Club directors can update seasons" 
ON public.seasons 
FOR UPDATE 
USING ((club_id IS NULL) OR is_club_director(auth.uid(), club_id));

CREATE POLICY "Club directors can delete seasons" 
ON public.seasons 
FOR DELETE 
USING ((club_id IS NULL) OR is_club_director(auth.uid(), club_id));

-- Add season_id to player_ratings
ALTER TABLE public.player_ratings 
ADD COLUMN season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_player_ratings_season ON public.player_ratings(season_id);
CREATE INDEX idx_seasons_club_active ON public.seasons(club_id, is_active);

-- Create trigger for automatic timestamp updates on seasons
CREATE TRIGGER update_seasons_updated_at
BEFORE UPDATE ON public.seasons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();