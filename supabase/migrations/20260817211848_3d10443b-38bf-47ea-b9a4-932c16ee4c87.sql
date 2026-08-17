ALTER TABLE public.matches REPLICA IDENTITY FULL;
ALTER TABLE public.match_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

CREATE OR REPLACE FUNCTION public.incoming_boops(_pet_id uuid)
RETURNS TABLE (actor_pet_id uuid, direction text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.actor_pet_id, s.direction, s.created_at
  FROM public.swipes s
  JOIN public.pets p ON p.id = _pet_id
  WHERE s.target_pet_id = _pet_id
    AND s.direction IN ('like', 'boop')
    AND p.user_id = auth.uid()
$$;
REVOKE ALL ON FUNCTION public.incoming_boops(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.incoming_boops(uuid) TO authenticated;