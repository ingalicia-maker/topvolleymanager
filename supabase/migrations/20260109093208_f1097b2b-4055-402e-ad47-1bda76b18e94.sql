-- Drop the existing restrictive INSERT policy for clubs
DROP POLICY IF EXISTS "Authenticated users can create clubs" ON public.clubs;

-- Create a permissive INSERT policy for clubs
CREATE POLICY "Authenticated users can create clubs" 
ON public.clubs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);