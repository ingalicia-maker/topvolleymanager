-- Create storage bucket for downloadable resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to resources bucket
CREATE POLICY "Public can view resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'resources');

-- Allow admins to upload resources
CREATE POLICY "Admins can upload resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND public.is_app_admin(u.email)
  )
);

-- Allow admins to update resources
CREATE POLICY "Admins can update resources"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND public.is_app_admin(u.email)
  )
);

-- Allow admins to delete resources
CREATE POLICY "Admins can delete resources"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND public.is_app_admin(u.email)
  )
);

-- Create resources table to track downloadable documents
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'guide',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  icon TEXT DEFAULT 'FileText',
  is_published BOOLEAN NOT NULL DEFAULT false,
  download_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Public can view published resources
CREATE POLICY "Public can view published resources"
ON public.resources FOR SELECT
USING (is_published = true);

-- Admins can do everything with resources
CREATE POLICY "Admins can manage resources"
ON public.resources FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND public.is_app_admin(u.email)
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_resources_updated_at
BEFORE UPDATE ON public.resources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();