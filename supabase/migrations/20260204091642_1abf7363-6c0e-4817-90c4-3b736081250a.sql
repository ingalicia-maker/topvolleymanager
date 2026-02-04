-- Create table for exercise categories
CREATE TABLE public.exercise_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_it TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  description_it TEXT,
  icon TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for exercise scopes (youth, senior)
CREATE TABLE public.exercise_scopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_it TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  description_it TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for exercises
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.exercise_categories(id) ON DELETE CASCADE,
  scope_id UUID NOT NULL REFERENCES public.exercise_scopes(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_it TEXT NOT NULL,
  purpose_es TEXT,
  purpose_en TEXT,
  purpose_it TEXT,
  how_it_works_es TEXT,
  how_it_works_en TEXT,
  how_it_works_it TEXT,
  variations_es TEXT,
  variations_en TEXT,
  variations_it TEXT,
  requirements_es TEXT,
  requirements_en TEXT,
  requirements_it TEXT,
  difficulty INTEGER NOT NULL DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 3),
  min_players INTEGER,
  max_players INTEGER,
  image_url TEXT,
  diagram_url TEXT,
  video_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Public read access for all exercise-related tables
CREATE POLICY "Exercise categories are publicly readable"
ON public.exercise_categories
FOR SELECT
USING (true);

CREATE POLICY "Exercise scopes are publicly readable"
ON public.exercise_scopes
FOR SELECT
USING (true);

CREATE POLICY "Published exercises are publicly readable"
ON public.exercises
FOR SELECT
USING (is_published = true);

-- Admin write access (for app admins)
CREATE POLICY "App admins can manage exercise categories"
ON public.exercise_categories
FOR ALL
USING (public.is_app_admin(auth.jwt() ->> 'email'));

CREATE POLICY "App admins can manage exercise scopes"
ON public.exercise_scopes
FOR ALL
USING (public.is_app_admin(auth.jwt() ->> 'email'));

CREATE POLICY "App admins can manage exercises"
ON public.exercises
FOR ALL
USING (public.is_app_admin(auth.jwt() ->> 'email'));

-- Create indexes for better performance
CREATE INDEX idx_exercises_category ON public.exercises(category_id);
CREATE INDEX idx_exercises_scope ON public.exercises(scope_id);
CREATE INDEX idx_exercises_published ON public.exercises(is_published);
CREATE INDEX idx_exercises_slug ON public.exercises(slug);

-- Create trigger for updated_at
CREATE TRIGGER update_exercises_updated_at
BEFORE UPDATE ON public.exercises
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert exercise categories
INSERT INTO public.exercise_categories (slug, name_es, name_en, name_it, icon, order_index) VALUES
('serving', 'Saque', 'Serving', 'Servizio', 'target', 1),
('passing', 'Recepción', 'Passing', 'Ricezione', 'move-horizontal', 2),
('attacking', 'Ataque', 'Attacking', 'Attacco', 'zap', 3),
('serving-passing', 'Saque y Recepción', 'Serving & Passing', 'Servizio e Ricezione', 'shuffle', 4),
('blocking', 'Bloqueo', 'Blocking', 'Muro', 'shield', 5),
('individual-defense', 'Defensa Individual', 'Individual Defense', 'Difesa Individuale', 'user-check', 6),
('team-defense', 'Defensa de Equipo', 'Team Defense', 'Difesa di Squadra', 'users', 7),
('ball-control-warmup', 'Control de Balón y Calentamiento', 'Ball Control & Warm-up', 'Controllo Palla e Riscaldamento', 'activity', 8),
('team-offense', 'Ataque de Equipo', 'Team Offense', 'Attacco di Squadra', 'trending-up', 9),
('team-drills', 'Ejercicios de Equipo', 'Team Drills', 'Esercizi di Squadra', 'users-round', 10),
('wash-drills', 'Ejercicios Wash', 'Wash Drills', 'Esercizi Wash', 'repeat', 11);

-- Insert exercise scopes
INSERT INTO public.exercise_scopes (slug, name_es, name_en, name_it, description_es, description_en, description_it, order_index) VALUES
('youth', 'Juvenil', 'Youth', 'Giovanile', 'Ejercicios adaptados para jugadores jóvenes y principiantes', 'Exercises adapted for young and beginner players', 'Esercizi adattati per giovani giocatori e principianti', 1),
('senior', 'Senior', 'Senior', 'Senior', 'Ejercicios para jugadores avanzados y equipos competitivos', 'Exercises for advanced players and competitive teams', 'Esercizi per giocatori avanzati e squadre competitive', 2);