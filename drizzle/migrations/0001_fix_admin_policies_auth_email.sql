ALTER POLICY "Admins can manage articles" ON public.blog_articles USING (public.is_app_admin(auth.email())) WITH CHECK (public.is_app_admin(auth.email()));
ALTER POLICY "Admins can manage categories" ON public.blog_categories USING (public.is_app_admin(auth.email())) WITH CHECK (public.is_app_admin(auth.email()));
ALTER POLICY "Admins can manage resources" ON public.resources USING (public.is_app_admin(auth.email()));
ALTER POLICY "App admins can view all registrations" ON public.user_registrations USING (public.is_app_admin(auth.email()));
ALTER POLICY "App admins can update registrations" ON public.user_registrations USING (public.is_app_admin(auth.email()));
ALTER POLICY "App admins can delete registrations" ON public.user_registrations USING (public.is_app_admin(auth.email()));
ALTER POLICY "App admins can manage VIP users" ON public.vip_users USING (public.is_app_admin(auth.email()));
ALTER POLICY "Users can check their own VIP status" ON public.vip_users USING (lower(email) = lower(auth.email()));