CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  locale text NOT NULL DEFAULT 'es',
  referrer text,
  session_id uuid NOT NULL,
  user_id uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.page_views TO anon;
GRANT INSERT ON public.page_views TO authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT ALL ON public.page_views TO service_role;

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visitors can record anonymous page views"
ON public.page_views
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can record their own page views"
ON public.page_views
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "App admins can view page analytics"
ON public.page_views
FOR SELECT
TO authenticated
USING (public.is_app_admin(auth.email()));

CREATE INDEX page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX page_views_path_created_at_idx ON public.page_views (path, created_at DESC);
CREATE INDEX page_views_locale_created_at_idx ON public.page_views (locale, created_at DESC);