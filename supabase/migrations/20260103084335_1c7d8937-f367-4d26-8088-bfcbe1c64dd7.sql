-- Create club_settings table for club customization
CREATE TABLE public.club_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name text NOT NULL DEFAULT 'Mi Club',
  primary_color text NOT NULL DEFAULT '221 83% 53%', -- Blue HSL values
  accent_color text NOT NULL DEFAULT '25 95% 53%', -- Orange HSL values  
  font_family text NOT NULL DEFAULT 'Inter',
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view club settings
CREATE POLICY "Anyone can view club settings"
ON public.club_settings
FOR SELECT
USING (true);

-- Only directors can update club settings
CREATE POLICY "Directors can update club settings"
ON public.club_settings
FOR UPDATE
USING (is_director(auth.uid()));

-- Only directors can insert club settings
CREATE POLICY "Directors can insert club settings"
ON public.club_settings
FOR INSERT
WITH CHECK (is_director(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_club_settings_updated_at
BEFORE UPDATE ON public.club_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.club_settings (club_name, primary_color, accent_color, font_family)
VALUES ('Mi Club de Voleibol', '221 83% 53%', '25 95% 53%', 'Inter');

-- Create storage bucket for club logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('club-logos', 'club-logos', true);

-- Storage policies for club logos
CREATE POLICY "Anyone can view club logos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'club-logos');

CREATE POLICY "Directors can upload club logos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'club-logos' AND is_director(auth.uid()));

CREATE POLICY "Directors can update club logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'club-logos' AND is_director(auth.uid()));

CREATE POLICY "Directors can delete club logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'club-logos' AND is_director(auth.uid()));