-- 1. Add CHECK constraints to feedback table to prevent oversized payloads
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_name_length CHECK (char_length(name) > 0 AND char_length(name) <= 100),
  ADD CONSTRAINT feedback_message_length CHECK (char_length(message) > 0 AND char_length(message) <= 1000);

-- 2. Create a safer is_admin() function that only checks the calling user
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  );
$$;

-- 3. Revoke public execute on has_role so it can no longer be called as an RPC for enumeration.
-- RLS policies that reference has_role(...) continue to work because policy evaluation runs
-- with elevated privileges and does not require EXECUTE on the referenced function.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;

-- Allow authenticated users to call is_admin() for their own admin checks
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;