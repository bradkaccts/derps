CREATE TABLE public.meetups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  venue_id text NOT NULL,
  proposed_by_user_id uuid NOT NULL,
  scheduled_start timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  state text NOT NULL DEFAULT 'Proposed',
  checkin_a_at timestamptz,
  checkin_b_at timestamptz,
  recurrence_rule text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX meetups_match_id_idx ON public.meetups (match_id);

GRANT SELECT, INSERT, UPDATE ON public.meetups TO authenticated;
GRANT ALL ON public.meetups TO service_role;

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read match meetups"
  ON public.meetups FOR SELECT TO authenticated
  USING (public.is_match_participant(match_id, auth.uid()));

CREATE POLICY "Participants create match meetups"
  ON public.meetups FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = proposed_by_user_id
    AND public.is_match_participant(match_id, auth.uid())
  );

CREATE POLICY "Participants update match meetups"
  ON public.meetups FOR UPDATE TO authenticated
  USING (public.is_match_participant(match_id, auth.uid()))
  WITH CHECK (public.is_match_participant(match_id, auth.uid()));

CREATE TRIGGER update_meetups_updated_at
  BEFORE UPDATE ON public.meetups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.meetups;