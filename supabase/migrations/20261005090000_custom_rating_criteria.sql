-- Custom rating criteria per club.
-- The five original criteria keep their columns in player_ratings (so existing ratings stay
-- valid); a club can hide any of them, rename them, reorder them and add its own criteria,
-- whose scores are stored in player_ratings.extra_scores ({ "<criterion id>": 1..10 }).

CREATE TABLE IF NOT EXISTS public.rating_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  builtin_key text CHECK (builtin_key IN (
    'effort_attitude', 'communication_cooperation', 'technical_execution',
    'decision_making', 'leadership_initiative'
  )),
  label text CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 60),
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (builtin_key IS NOT NULL OR label IS NOT NULL),
  UNIQUE (club_id, builtin_key)
);

CREATE INDEX IF NOT EXISTS rating_criteria_club_idx ON public.rating_criteria (club_id, position);

ALTER TABLE public.rating_criteria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Club members can view rating criteria" ON public.rating_criteria;
CREATE POLICY "Club members can view rating criteria" ON public.rating_criteria
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club directors can manage rating criteria" ON public.rating_criteria;
CREATE POLICY "Club directors can manage rating criteria" ON public.rating_criteria
  FOR ALL TO authenticated
  USING (public.is_club_director(auth.uid(), club_id))
  WITH CHECK (public.is_club_director(auth.uid(), club_id));

-- Scores of custom criteria, and the original criteria become optional (a club may hide them).
ALTER TABLE public.player_ratings ADD COLUMN IF NOT EXISTS extra_scores jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.player_ratings ALTER COLUMN effort_attitude DROP NOT NULL;
ALTER TABLE public.player_ratings ALTER COLUMN communication_cooperation DROP NOT NULL;
ALTER TABLE public.player_ratings ALTER COLUMN technical_execution DROP NOT NULL;
ALTER TABLE public.player_ratings ALTER COLUMN decision_making DROP NOT NULL;
ALTER TABLE public.player_ratings ALTER COLUMN leadership_initiative DROP NOT NULL;
