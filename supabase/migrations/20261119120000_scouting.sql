-- Coach area, phase 1: live match scouting (line-ups, rotations, actions, attack flows).
-- A match is an append-only log of actions; the app replays it to get the score,
-- rotations, substitutions and stats. Undo is itself an action, so every device
-- only needs to listen to inserts.

CREATE TABLE IF NOT EXISTS public.scout_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  opponent text NOT NULL DEFAULT '',
  match_date date NOT NULL DEFAULT CURRENT_DATE,
  best_of integer NOT NULL DEFAULT 5 CHECK (best_of IN (3, 5)),
  status text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'finished')),
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scout_matches_team_idx ON public.scout_matches (team_id, match_date DESC);
CREATE INDEX IF NOT EXISTS scout_matches_club_idx ON public.scout_matches (club_id);

CREATE TABLE IF NOT EXISTS public.scout_actions (
  id uuid PRIMARY KEY, -- generated on the device so offline actions can be retried safely
  match_id uuid NOT NULL REFERENCES public.scout_matches(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  client_ts bigint NOT NULL,
  kind text NOT NULL CHECK (kind IN ('lineup', 'skill', 'point', 'sub', 'score', 'undo')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scout_actions_match_idx ON public.scout_actions (match_id, client_ts);

ALTER TABLE public.scout_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Club members can view scout matches"
  ON public.scout_matches FOR SELECT
  USING (public.user_belongs_to_club(auth.uid(), club_id));
CREATE POLICY "Club members can create scout matches"
  ON public.scout_matches FOR INSERT
  WITH CHECK (public.user_belongs_to_club(auth.uid(), club_id));
CREATE POLICY "Club members can update scout matches"
  ON public.scout_matches FOR UPDATE
  USING (public.user_belongs_to_club(auth.uid(), club_id))
  WITH CHECK (public.user_belongs_to_club(auth.uid(), club_id));
CREATE POLICY "Club members can delete scout matches"
  ON public.scout_matches FOR DELETE
  USING (public.user_belongs_to_club(auth.uid(), club_id));

CREATE POLICY "Club members can view scout actions"
  ON public.scout_actions FOR SELECT
  USING (public.user_belongs_to_club(auth.uid(), club_id));
CREATE POLICY "Club members can add scout actions"
  ON public.scout_actions FOR INSERT
  WITH CHECK (
    public.user_belongs_to_club(auth.uid(), club_id)
    AND EXISTS (
      SELECT 1 FROM public.scout_matches m
      WHERE m.id = match_id AND m.club_id = scout_actions.club_id
    )
  );

CREATE OR REPLACE FUNCTION public.touch_scout_match_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scout_matches_touch ON public.scout_matches;
CREATE TRIGGER scout_matches_touch
  BEFORE UPDATE ON public.scout_matches
  FOR EACH ROW EXECUTE FUNCTION public.touch_scout_match_updated_at();

-- Live sync between the scout's phone and the coach's devices.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.scout_actions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
