DROP POLICY IF EXISTS "Pets are viewable by everyone" ON public.pets;
CREATE POLICY "Discoverable pets are viewable" ON public.pets FOR SELECT TO anon, authenticated
  USING ((is_discoverable AND NOT safety_hold) OR auth.uid() = user_id);
REVOKE SELECT ON public.pets FROM anon;
GRANT SELECT (id, user_id, name, species, breed, age, age_category, gender, vibes, bio, fun_fact, location, photos, health_verified, created_at, updated_at, is_discoverable, social_status, intact, age_weeks, vaccination_attested_at, vaccination_expires_at, last_active_at, safety_hold) ON public.pets TO anon;
GRANT SELECT ON public.pets TO authenticated;

DROP POLICY IF EXISTS "Personalities are viewable by everyone" ON public.pet_personalities;
CREATE POLICY "Personalities of discoverable pets are viewable" ON public.pet_personalities FOR SELECT TO anon, authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.is_discoverable AND NOT p.safety_hold));
GRANT SELECT ON public.pet_personalities TO anon, authenticated;

DROP POLICY IF EXISTS "Preferences are viewable by everyone" ON public.pet_preferences;
REVOKE SELECT ON public.pet_preferences FROM anon;
CREATE POLICY "Signed-in users view preferences of discoverable pets" ON public.pet_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = pet_id AND p.is_discoverable AND NOT p.safety_hold));
GRANT SELECT ON public.pet_preferences TO authenticated;