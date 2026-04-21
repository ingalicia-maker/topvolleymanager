-- Step 1: Create pivot tables for many-to-many relationships
CREATE TABLE IF NOT EXISTS public.exercise_category_links (
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.exercise_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.exercise_scope_links (
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  scope_id UUID NOT NULL REFERENCES public.exercise_scopes(id) ON DELETE CASCADE,
  PRIMARY KEY (exercise_id, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_category_links_cat ON public.exercise_category_links(category_id);
CREATE INDEX IF NOT EXISTS idx_exercise_scope_links_scope ON public.exercise_scope_links(scope_id);

-- Step 2: Enable RLS
ALTER TABLE public.exercise_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_scope_links ENABLE ROW LEVEL SECURITY;

-- Step 3: RLS policies (publicly readable like categories/scopes; admins manage)
CREATE POLICY "Exercise category links are publicly readable"
ON public.exercise_category_links FOR SELECT
USING (true);

CREATE POLICY "App admins can manage exercise category links"
ON public.exercise_category_links FOR ALL
USING (is_app_admin((auth.jwt() ->> 'email'::text)))
WITH CHECK (is_app_admin((auth.jwt() ->> 'email'::text)));

CREATE POLICY "Authenticated users can link own exercise categories"
ON public.exercise_category_links FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.created_by = auth.uid()
));

CREATE POLICY "Authenticated users can unlink own exercise categories"
ON public.exercise_category_links FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.created_by = auth.uid()
));

CREATE POLICY "Exercise scope links are publicly readable"
ON public.exercise_scope_links FOR SELECT
USING (true);

CREATE POLICY "App admins can manage exercise scope links"
ON public.exercise_scope_links FOR ALL
USING (is_app_admin((auth.jwt() ->> 'email'::text)))
WITH CHECK (is_app_admin((auth.jwt() ->> 'email'::text)));

CREATE POLICY "Authenticated users can link own exercise scopes"
ON public.exercise_scope_links FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.created_by = auth.uid()
));

CREATE POLICY "Authenticated users can unlink own exercise scopes"
ON public.exercise_scope_links FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.exercises e WHERE e.id = exercise_id AND e.created_by = auth.uid()
));

-- Step 4: Unify duplicate categories. Keep canonical English-slug versions, merge Spanish-slug duplicates into them.
-- Mapping: saque->serving, remate->attacking, defensa->individual-defense, recepcion->passing,
-- bloqueo->blocking, calentamiento->ball-control-warmup
DO $$
DECLARE
  dup RECORD;
  canonical_id UUID;
BEGIN
  FOR dup IN
    SELECT old_slug, new_slug FROM (VALUES
      ('saque', 'serving'),
      ('remate', 'attacking'),
      ('defensa', 'individual-defense'),
      ('recepcion', 'passing'),
      ('bloqueo', 'blocking'),
      ('calentamiento', 'ball-control-warmup')
    ) AS t(old_slug, new_slug)
  LOOP
    SELECT id INTO canonical_id FROM public.exercise_categories WHERE slug = dup.new_slug LIMIT 1;
    IF canonical_id IS NOT NULL THEN
      UPDATE public.exercises e
      SET category_id = canonical_id
      FROM public.exercise_categories oc
      WHERE e.category_id = oc.id AND oc.slug = dup.old_slug;

      DELETE FROM public.exercise_categories WHERE slug = dup.old_slug;
    END IF;
  END LOOP;
END $$;

-- Step 5: Backfill pivot tables from existing single category_id and scope_id
INSERT INTO public.exercise_category_links (exercise_id, category_id)
SELECT id, category_id FROM public.exercises WHERE category_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.exercise_scope_links (exercise_id, scope_id)
SELECT id, scope_id FROM public.exercises WHERE scope_id IS NOT NULL
ON CONFLICT DO NOTHING;