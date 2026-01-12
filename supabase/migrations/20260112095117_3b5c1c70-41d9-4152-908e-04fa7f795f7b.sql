-- Make player-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'player-photos';

-- Drop existing public access policy
DROP POLICY IF EXISTS "Anyone can view player photos" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create new policies for authenticated access only
CREATE POLICY "Authenticated users can view player photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'player-photos' 
  AND auth.role() = 'authenticated'
);

-- Keep upload/update/delete policies for authenticated users
DROP POLICY IF EXISTS "Authenticated users can upload player photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload player photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'player-photos' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can update player photos" ON storage.objects;
CREATE POLICY "Authenticated users can update player photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'player-photos' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Authenticated users can delete player photos" ON storage.objects;
CREATE POLICY "Authenticated users can delete player photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'player-photos' 
  AND auth.role() = 'authenticated'
);