-- Drop existing public policy
DROP POLICY IF EXISTS "Anyone can check admin status" ON public.app_admins;

-- Create new policy that requires authentication
CREATE POLICY "Authenticated users can check admin status" 
ON public.app_admins 
FOR SELECT 
TO authenticated
USING (true);