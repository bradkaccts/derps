-- Restrict profile reads to signed-in users. The previous public policy
-- exposed phone numbers, verification tier and trust scores of every user
-- to the unauthenticated internet.
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Profiles are viewable by signed-in users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Remove the anonymous read grant entirely so there is no path to the table
-- without a session.
REVOKE SELECT ON public.profiles FROM anon;