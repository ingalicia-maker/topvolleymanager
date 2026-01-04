-- Create stops table for customizable bus stops
CREATE TABLE public.stops (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Enable RLS
ALTER TABLE public.stops ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view stops" ON public.stops
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create stops" ON public.stops
FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can update stops" ON public.stops
FOR UPDATE USING (true);

CREATE POLICY "Authenticated users can delete stops" ON public.stops
FOR DELETE USING (true);

-- Insert default stops
INSERT INTO public.stops (name, order_index) VALUES
  ('Los Rosales', 1),
  ('Sagrada', 2),
  ('Os Carballos', 3),
  ('Alfonso Molina', 4);

-- Add photo_url column to players
ALTER TABLE public.players ADD COLUMN photo_url text;

-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public) VALUES ('player-photos', 'player-photos', true);

-- Storage policies for player photos
CREATE POLICY "Anyone can view player photos" ON storage.objects
FOR SELECT USING (bucket_id = 'player-photos');

CREATE POLICY "Authenticated users can upload player photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update player photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete player photos" ON storage.objects
FOR DELETE USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');