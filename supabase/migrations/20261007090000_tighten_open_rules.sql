-- Close the remaining open rules flagged by the security scan.

-- 1) Club logos live in a folder named after the club: <club_id>/logo-....
--    Only that club's directors can add, replace or delete them. Logos stay public to view.
DROP POLICY IF EXISTS "Directors can upload club logos" ON storage.objects;
DROP POLICY IF EXISTS "Directors can update club logos" ON storage.objects;
DROP POLICY IF EXISTS "Directors can delete club logos" ON storage.objects;
CREATE POLICY "Directors can upload club logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'club-logos' AND EXISTS (
  SELECT 1 FROM public.club_members m
  WHERE m.user_id = auth.uid() AND m.role = 'director' AND m.club_id::text = (storage.foldername(name))[1]));
CREATE POLICY "Directors can update club logos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'club-logos' AND EXISTS (
  SELECT 1 FROM public.club_members m
  WHERE m.user_id = auth.uid() AND m.role = 'director' AND m.club_id::text = (storage.foldername(name))[1]));
CREATE POLICY "Directors can delete club logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'club-logos' AND EXISTS (
  SELECT 1 FROM public.club_members m
  WHERE m.user_id = auth.uid() AND m.role = 'director' AND m.club_id::text = (storage.foldername(name))[1]));

-- 2) Blog images: only app admins upload them
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Admins can upload blog images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND public.is_app_admin(auth.email()));

-- 3) Exercise links: visible only for published exercises (or your own)
DROP POLICY IF EXISTS "Exercise category links are publicly readable" ON public.exercise_category_links;
CREATE POLICY "Exercise category links are publicly readable" ON public.exercise_category_links FOR SELECT
USING (EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND (e.is_published OR e.created_by = auth.uid())));
DROP POLICY IF EXISTS "Exercise scope links are publicly readable" ON public.exercise_scope_links;
CREATE POLICY "Exercise scope links are publicly readable" ON public.exercise_scope_links FOR SELECT
USING (EXISTS (SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND (e.is_published OR e.created_by = auth.uid())));

-- 4) Newsletter sign-up: only a real, active subscription with privacy accepted
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers FOR INSERT TO anon, authenticated
WITH CHECK (
  email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254
  AND is_active AND unsubscribed_at IS NULL AND privacy_accepted_at IS NOT NULL
);

-- Check: any rule that still lets everyone in (public catalogues such as categories are expected)
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
  AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename;
