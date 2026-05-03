
DROP POLICY IF EXISTS "Authenticated users can insert registrations" ON public.user_registrations;
CREATE POLICY "Users can insert their own registration"
ON public.user_registrations
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND lower(email) = lower(auth.email())
);

DROP POLICY IF EXISTS "Authenticated users can view player photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload player photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update player photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete player photos" ON storage.objects;

CREATE POLICY "Club members can view player photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM public.players p
    WHERE storage.objects.name LIKE p.id::text || '-%'
      AND p.club_id IS NOT NULL
      AND public.user_belongs_to_club(auth.uid(), p.club_id)
  )
);

CREATE POLICY "Club members can upload player photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM public.players p
    WHERE storage.objects.name LIKE p.id::text || '-%'
      AND p.club_id IS NOT NULL
      AND public.user_belongs_to_club(auth.uid(), p.club_id)
  )
);

CREATE POLICY "Club members can update player photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM public.players p
    WHERE storage.objects.name LIKE p.id::text || '-%'
      AND p.club_id IS NOT NULL
      AND public.user_belongs_to_club(auth.uid(), p.club_id)
  )
);

CREATE POLICY "Club members can delete player photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'player-photos'
  AND EXISTS (
    SELECT 1 FROM public.players p
    WHERE storage.objects.name LIKE p.id::text || '-%'
      AND p.club_id IS NOT NULL
      AND public.user_belongs_to_club(auth.uid(), p.club_id)
  )
);
