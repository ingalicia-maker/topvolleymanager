-- Add translatable name columns to blog_categories
ALTER TABLE public.blog_categories 
  ADD COLUMN IF NOT EXISTS name_en TEXT,
  ADD COLUMN IF NOT EXISTS name_it TEXT;

-- Update existing categories with translations
UPDATE public.blog_categories SET name_en = 'Training', name_it = 'Allenamento' WHERE slug = 'entrenamiento';
UPDATE public.blog_categories SET name_en = 'Team Management', name_it = 'Gestione della Squadra' WHERE slug = 'gestion';
UPDATE public.blog_categories SET name_en = 'Team Management', name_it = 'Gestione della Squadra' WHERE slug = 'gestion-equipos';
UPDATE public.blog_categories SET name_en = 'Nutrition', name_it = 'Nutrizione' WHERE slug = 'nutricion';
UPDATE public.blog_categories SET name_en = 'Psychology', name_it = 'Psicologia' WHERE slug = 'psicologia';
UPDATE public.blog_categories SET name_en = 'Tactics', name_it = 'Tattica' WHERE slug = 'tacticas';
UPDATE public.blog_categories SET name_en = 'Technique', name_it = 'Tecnica' WHERE slug = 'tecnica';