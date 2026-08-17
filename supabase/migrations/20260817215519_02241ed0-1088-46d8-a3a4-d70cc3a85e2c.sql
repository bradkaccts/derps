REVOKE ALL ON public.match_messages FROM PUBLIC;
REVOKE ALL ON public.match_messages FROM anon;
REVOKE ALL ON public.match_messages FROM authenticated;

GRANT SELECT, INSERT ON public.match_messages TO authenticated;
GRANT ALL ON public.match_messages TO service_role;

ALTER TABLE public.match_messages ENABLE ROW LEVEL SECURITY;