
-- 1. Fix newsletter_subscribers: remove public SELECT, keep admin-only
DROP POLICY IF EXISTS "Users can view own subscription" ON public.newsletter_subscribers;
CREATE POLICY "Users can view own subscription"
ON public.newsletter_subscribers FOR SELECT
TO anon, authenticated
USING (lower(email) = lower(auth.email()));

-- 2. Fix user_registrations: restrict INSERT to authenticated only
DROP POLICY IF EXISTS "Service role can insert registrations" ON public.user_registrations;
CREATE POLICY "Authenticated users can insert registrations"
ON public.user_registrations FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Fix player_ratings: remove NULL club_id bypass
DROP POLICY IF EXISTS "Users can view ratings from their club" ON public.player_ratings;
CREATE POLICY "Users can view ratings from their club"
ON public.player_ratings FOR SELECT TO authenticated
USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can create ratings" ON public.player_ratings;
CREATE POLICY "Club members can create ratings"
ON public.player_ratings FOR INSERT TO authenticated
WITH CHECK (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Coaches can update their own ratings" ON public.player_ratings;
CREATE POLICY "Coaches can update their own ratings"
ON public.player_ratings FOR UPDATE TO authenticated
USING (rated_by = auth.uid() AND club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id))
WITH CHECK (rated_by = auth.uid() AND club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club directors can manage ratings" ON public.player_ratings;
CREATE POLICY "Club directors can manage ratings"
ON public.player_ratings FOR ALL TO authenticated
USING (club_id IS NOT NULL AND is_club_director(auth.uid(), club_id))
WITH CHECK (club_id IS NOT NULL AND is_club_director(auth.uid(), club_id));

-- 4. Fix events: remove NULL club_id bypass
DROP POLICY IF EXISTS "Users can view events from their club" ON public.events;
CREATE POLICY "Users can view events from their club"
ON public.events FOR SELECT USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can create events" ON public.events;
CREATE POLICY "Club members can create events"
ON public.events FOR INSERT WITH CHECK (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can update events" ON public.events;
CREATE POLICY "Club members can update events"
ON public.events FOR UPDATE USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can delete events" ON public.events;
CREATE POLICY "Club members can delete events"
ON public.events FOR DELETE USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

-- 5. Fix teams: remove NULL club_id bypass
DROP POLICY IF EXISTS "Users can view teams from their club" ON public.teams;
CREATE POLICY "Users can view teams from their club"
ON public.teams FOR SELECT USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can create teams" ON public.teams;
CREATE POLICY "Club members can create teams"
ON public.teams FOR INSERT WITH CHECK (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can update teams" ON public.teams;
CREATE POLICY "Club members can update teams"
ON public.teams FOR UPDATE USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club directors can delete teams" ON public.teams;
CREATE POLICY "Club directors can delete teams"
ON public.teams FOR DELETE TO authenticated USING (club_id IS NOT NULL AND is_club_director(auth.uid(), club_id));

-- 6. Fix stops: remove NULL club_id bypass
DROP POLICY IF EXISTS "Users can view stops from their club" ON public.stops;
CREATE POLICY "Users can view stops from their club"
ON public.stops FOR SELECT USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can create stops" ON public.stops;
CREATE POLICY "Club members can create stops"
ON public.stops FOR INSERT WITH CHECK (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can update stops" ON public.stops;
CREATE POLICY "Club members can update stops"
ON public.stops FOR UPDATE USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club members can delete stops" ON public.stops;
CREATE POLICY "Club members can delete stops"
ON public.stops FOR DELETE USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

-- 7. Fix seasons: remove NULL club_id bypass
DROP POLICY IF EXISTS "Users can view seasons from their club" ON public.seasons;
CREATE POLICY "Users can view seasons from their club"
ON public.seasons FOR SELECT USING (club_id IS NOT NULL AND user_belongs_to_club(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club directors can create seasons" ON public.seasons;
CREATE POLICY "Club directors can create seasons"
ON public.seasons FOR INSERT WITH CHECK (club_id IS NOT NULL AND is_club_director(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club directors can update seasons" ON public.seasons;
CREATE POLICY "Club directors can update seasons"
ON public.seasons FOR UPDATE USING (club_id IS NOT NULL AND is_club_director(auth.uid(), club_id));

DROP POLICY IF EXISTS "Club directors can delete seasons" ON public.seasons;
CREATE POLICY "Club directors can delete seasons"
ON public.seasons FOR DELETE USING (club_id IS NOT NULL AND is_club_director(auth.uid(), club_id));

-- 8. Fix club_settings: restrict SELECT to club members
DROP POLICY IF EXISTS "Club members can view club settings" ON public.club_settings;
CREATE POLICY "Club members can view club settings"
ON public.club_settings FOR SELECT TO authenticated
USING (user_belongs_to_club(auth.uid(), id));

-- 9. Fix conversations: broken self-join in SELECT policy
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conversations.id AND cp.user_id = auth.uid()
  )
);
