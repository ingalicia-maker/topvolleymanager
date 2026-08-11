GRANT SELECT ON public.app_admins TO authenticated;
GRANT ALL ON public.app_admins TO service_role;

GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.newsletters TO authenticated;
GRANT ALL ON public.newsletters TO service_role;

DROP POLICY IF EXISTS "Admins can manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage newsletter subscribers"
ON public.newsletter_subscribers
FOR ALL
TO authenticated
USING (public.is_app_admin(auth.email()))
WITH CHECK (public.is_app_admin(auth.email()));

DROP POLICY IF EXISTS "Admins can manage newsletters" ON public.newsletters;
CREATE POLICY "Admins can manage newsletters"
ON public.newsletters
FOR ALL
TO authenticated
USING (public.is_app_admin(auth.email()))
WITH CHECK (public.is_app_admin(auth.email()));