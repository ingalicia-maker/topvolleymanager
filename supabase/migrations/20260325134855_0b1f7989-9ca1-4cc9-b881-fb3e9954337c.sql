
-- Fix players table: remove NULL club_id bypass from all policies
DROP POLICY IF EXISTS "Club members can create players" ON public.players;
CREATE POLICY "Club members can create players" ON public.players
  FOR INSERT TO authenticated
  WITH CHECK (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can delete players" ON public.players;
CREATE POLICY "Club members can delete players" ON public.players
  FOR DELETE TO authenticated
  USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can update players" ON public.players;
CREATE POLICY "Club members can update players" ON public.players
  FOR UPDATE TO authenticated
  USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Users can view players from their club" ON public.players;
CREATE POLICY "Users can view players from their club" ON public.players
  FOR SELECT TO authenticated
  USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

-- Fix ausencias table: remove NULL club_id bypass from all policies
DROP POLICY IF EXISTS "Club members can create ausencias" ON public.ausencias;
CREATE POLICY "Club members can create ausencias" ON public.ausencias
  FOR INSERT TO authenticated
  WITH CHECK (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can delete ausencias" ON public.ausencias;
CREATE POLICY "Club members can delete ausencias" ON public.ausencias
  FOR DELETE TO authenticated
  USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can update ausencias" ON public.ausencias;
CREATE POLICY "Club members can update ausencias" ON public.ausencias
  FOR UPDATE TO authenticated
  USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Users can view ausencias from their club" ON public.ausencias;
CREATE POLICY "Users can view ausencias from their club" ON public.ausencias
  FOR SELECT TO authenticated
  USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));
