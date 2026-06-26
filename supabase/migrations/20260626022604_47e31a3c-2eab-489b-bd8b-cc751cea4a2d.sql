
-- Replace is_co_admin to use user_roles instead of a hardcoded email JWT claim.
CREATE OR REPLACE FUNCTION public.is_co_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'co_admin'::public.app_role
  );
$$;

-- Tighten leaderboard: drop any public INSERT policy, require auth.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leaderboard' AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.leaderboard', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can submit scores"
  ON public.leaderboard
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
