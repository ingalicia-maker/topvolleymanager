-- Update the policy to use both anon and public roles for blog articles
DROP POLICY IF EXISTS "Anyone can view published articles" ON blog_articles;

CREATE POLICY "Anyone can view published articles" 
ON blog_articles 
FOR SELECT 
TO anon, authenticated
USING (is_published = true);