-- Fix player_ratings RLS: change RESTRICTIVE policies to PERMISSIVE
-- The problem is ALL policies are restrictive, meaning coaches can never insert

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Club directors can manage ratings" ON public.player_ratings;
DROP POLICY IF EXISTS "Club members can create ratings" ON public.player_ratings;
DROP POLICY IF EXISTS "Coaches can update their own ratings" ON public.player_ratings;
DROP POLICY IF EXISTS "Users can view ratings from their club" ON public.player_ratings;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Club directors can manage ratings" ON public.player_ratings
  FOR ALL TO authenticated
  USING (
    (club_id IS NULL) OR is_club_director(auth.uid(), club_id)
  )
  WITH CHECK (
    (club_id IS NULL) OR is_club_director(auth.uid(), club_id)
  );

CREATE POLICY "Club members can create ratings" ON public.player_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    (club_id IS NULL) OR user_belongs_to_club(auth.uid(), club_id)
  );

CREATE POLICY "Coaches can update their own ratings" ON public.player_ratings
  FOR UPDATE TO authenticated
  USING (
    rated_by = auth.uid() AND ((club_id IS NULL) OR user_belongs_to_club(auth.uid(), club_id))
  )
  WITH CHECK (
    rated_by = auth.uid() AND ((club_id IS NULL) OR user_belongs_to_club(auth.uid(), club_id))
  );

CREATE POLICY "Users can view ratings from their club" ON public.player_ratings
  FOR SELECT TO authenticated
  USING (
    (club_id IS NULL) OR user_belongs_to_club(auth.uid(), club_id)
  );