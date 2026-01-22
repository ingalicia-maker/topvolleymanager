-- Create blog categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog articles table
CREATE TABLE public.blog_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.blog_categories(id),
  tags TEXT[],
  featured_image TEXT,
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_articles ENABLE ROW LEVEL SECURITY;

-- Public read access for published articles
CREATE POLICY "Anyone can view published articles"
ON public.blog_articles
FOR SELECT
USING (is_published = true);

-- Public read access for categories
CREATE POLICY "Anyone can view categories"
ON public.blog_categories
FOR SELECT
USING (true);

-- Admin full access to articles (using app_admins table)
CREATE POLICY "Admins can manage articles"
ON public.blog_articles
FOR ALL
TO authenticated
USING (public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())))
WITH CHECK (public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Admin full access to categories
CREATE POLICY "Admins can manage categories"
ON public.blog_categories
FOR ALL
TO authenticated
USING (public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())))
WITH CHECK (public.is_app_admin((SELECT email FROM auth.users WHERE id = auth.uid())));

-- Trigger for updated_at
CREATE TRIGGER update_blog_articles_updated_at
BEFORE UPDATE ON public.blog_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description) VALUES
('Entrenamiento', 'entrenamiento', 'Artículos sobre técnicas y ejercicios de voleibol'),
('Gestión de Equipos', 'gestion-equipos', 'Consejos para gestionar equipos deportivos'),
('Tácticas', 'tacticas', 'Estrategias y tácticas de juego'),
('Nutrición', 'nutricion', 'Alimentación y rendimiento deportivo');