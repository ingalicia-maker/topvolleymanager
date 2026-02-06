-- Create storage bucket for blog images
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to blog images
CREATE POLICY "Public can view blog images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'blog-images');

-- Allow authenticated users to upload blog images
CREATE POLICY "Authenticated users can upload blog images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'blog-images' AND auth.role() = 'authenticated');

-- Add language column to blog articles if not exists
ALTER TABLE blog_articles ADD COLUMN IF NOT EXISTS language VARCHAR(2) DEFAULT 'es';

-- Create index for language queries
CREATE INDEX IF NOT EXISTS idx_blog_articles_language ON blog_articles(language);