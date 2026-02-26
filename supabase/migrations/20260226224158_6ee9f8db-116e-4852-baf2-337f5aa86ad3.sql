
-- Create exercise_favorites table
CREATE TABLE public.exercise_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE public.exercise_favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own favorites"
  ON public.exercise_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites"
  ON public.exercise_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites"
  ON public.exercise_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add created_by to exercises for coach-created exercises
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS created_by UUID;

-- Allow authenticated users to create exercises (coach-created)
CREATE POLICY "Authenticated users can create exercises"
  ON public.exercises FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow users to update their own exercises
CREATE POLICY "Users can update own exercises"
  ON public.exercises FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Allow users to delete their own exercises
CREATE POLICY "Users can delete own exercises"
  ON public.exercises FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());
