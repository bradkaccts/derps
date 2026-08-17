-- 1. Discovery fields on pets
ALTER TABLE public.pets
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD COLUMN is_discoverable boolean NOT NULL DEFAULT true,
  ADD COLUMN social_status text NOT NULL DEFAULT 'Active',
  ADD COLUMN intact boolean NOT NULL DEFAULT false,
  ADD COLUMN age_weeks integer NOT NULL DEFAULT 200,
  ADD COLUMN vaccination_attested_at timestamptz,
  ADD COLUMN vaccination_expires_at timestamptz,
  ADD COLUMN last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN safety_hold boolean NOT NULL DEFAULT false;

CREATE INDEX pets_discovery_idx ON public.pets (is_discoverable, latitude, longitude);

-- 2. Pet personalities (derived trait vector) — public read so candidates can be scored
CREATE TABLE public.pet_personalities (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  quiz_version text NOT NULL DEFAULT 'canine-v1',
  derivation_version text NOT NULL DEFAULT 'derive-v1',
  traits jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_personalities TO authenticated;
GRANT SELECT ON public.pet_personalities TO anon;
GRANT ALL ON public.pet_personalities TO service_role;
ALTER TABLE public.pet_personalities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personalities are viewable by everyone" ON public.pet_personalities FOR SELECT USING (true);
CREATE POLICY "Owners insert their pet personality" ON public.pet_personalities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their pet personality" ON public.pet_personalities FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their pet personality" ON public.pet_personalities FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_pet_personalities_updated_at BEFORE UPDATE ON public.pet_personalities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Pet preferences — public read (needed for mutual-fit scoring)
CREATE TABLE public.pet_preferences (
  pet_id uuid PRIMARY KEY REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  max_travel_miles integer NOT NULL DEFAULT 5,
  preferred_meetup_types text[] NOT NULL DEFAULT '{}',
  availability_windows text[] NOT NULL DEFAULT '{}',
  hard_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  cross_species_opt_in boolean NOT NULL DEFAULT false,
  intact_opt_out boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_preferences TO authenticated;
GRANT SELECT ON public.pet_preferences TO anon;
GRANT ALL ON public.pet_preferences TO service_role;
ALTER TABLE public.pet_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Preferences are viewable by everyone" ON public.pet_preferences FOR SELECT USING (true);
CREATE POLICY "Owners insert their pet preferences" ON public.pet_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their pet preferences" ON public.pet_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their pet preferences" ON public.pet_preferences FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_pet_preferences_updated_at BEFORE UPDATE ON public.pet_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Swipes — private to the actor
CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL,
  actor_pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  target_pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  direction text NOT NULL,
  score_at_impression integer,
  model_version text,
  feature_version text,
  strategy_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_pet_id, target_pet_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes TO authenticated;
GRANT ALL ON public.swipes TO service_role;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Actors read their own swipes" ON public.swipes FOR SELECT TO authenticated USING (auth.uid() = actor_user_id);
CREATE POLICY "Actors record their own swipes" ON public.swipes FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_user_id);
CREATE POLICY "Actors update their own swipes" ON public.swipes FOR UPDATE TO authenticated USING (auth.uid() = actor_user_id) WITH CHECK (auth.uid() = actor_user_id);
CREATE POLICY "Actors delete their own swipes" ON public.swipes FOR DELETE TO authenticated USING (auth.uid() = actor_user_id);
CREATE INDEX swipes_target_idx ON public.swipes (target_pet_id, direction);

-- 5. Matches — created only by the reciprocity trigger
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_a_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  pet_b_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_a_id uuid NOT NULL,
  user_b_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'Active',
  matched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  meetup_count integer NOT NULL DEFAULT 0,
  first_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matches_pet_order CHECK (pet_a_id < pet_b_id),
  UNIQUE (pet_a_id, pet_b_id)
);
GRANT SELECT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read their matches" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE POLICY "Participants update their matches" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = user_a_id OR auth.uid() = user_b_id) WITH CHECK (auth.uid() = user_a_id OR auth.uid() = user_b_id);
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Reciprocity trigger: a match exists only when both sides boop/heart
CREATE OR REPLACE FUNCTION public.handle_swipe_reciprocity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reciprocal public.swipes%ROWTYPE;
  a_pet uuid;
  b_pet uuid;
  a_user uuid;
  b_user uuid;
BEGIN
  IF NEW.direction NOT IN ('like', 'boop') THEN
    RETURN NEW;
  END IF;

  SELECT * INTO reciprocal
  FROM public.swipes
  WHERE actor_pet_id = NEW.target_pet_id
    AND target_pet_id = NEW.actor_pet_id
    AND direction IN ('like', 'boop')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.actor_pet_id < NEW.target_pet_id THEN
    a_pet := NEW.actor_pet_id; b_pet := NEW.target_pet_id;
    a_user := NEW.actor_user_id; b_user := reciprocal.actor_user_id;
  ELSE
    a_pet := NEW.target_pet_id; b_pet := NEW.actor_pet_id;
    a_user := reciprocal.actor_user_id; b_user := NEW.actor_user_id;
  END IF;

  INSERT INTO public.matches (pet_a_id, pet_b_id, user_a_id, user_b_id)
  VALUES (a_pet, b_pet, a_user, b_user)
  ON CONFLICT (pet_a_id, pet_b_id) DO NOTHING;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_swipe_reciprocity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_swipe_created AFTER INSERT ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.handle_swipe_reciprocity();

-- 7. Match participation helper
CREATE OR REPLACE FUNCTION public.is_match_participant(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE id = _match_id AND (user_a_id = _user_id OR user_b_id = _user_id)
  )
$$;
REVOKE ALL ON FUNCTION public.is_match_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_match_participant(uuid, uuid) TO authenticated;

-- 8. Match messages
CREATE TABLE public.match_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.match_messages TO authenticated;
GRANT ALL ON public.match_messages TO service_role;
ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read match messages" ON public.match_messages FOR SELECT TO authenticated USING (public.is_match_participant(match_id, auth.uid()));
CREATE POLICY "Participants send match messages" ON public.match_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_user_id AND public.is_match_participant(match_id, auth.uid()));
CREATE INDEX match_messages_match_idx ON public.match_messages (match_id, sent_at);

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_messages;