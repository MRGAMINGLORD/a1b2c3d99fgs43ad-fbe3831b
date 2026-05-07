
-- Helper: identify the co-admin by their signed-in email
CREATE OR REPLACE FUNCTION public.is_co_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt() ->> 'email') = '67er@coadmin.local', false)
$$;

-- Create the co-admin auth user if it doesn't already exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = '67er@coadmin.local';
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      '67er@coadmin.local',
      crypt('grahamloves67', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false,
      false
    );
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', '67er@coadmin.local'),
      'email',
      now(), now(), now()
    );
  END IF;
END $$;

-- ANNOUNCEMENTS: let the co-admin manage them
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;

CREATE POLICY "Admins or co-admin can insert announcements"
ON public.announcements FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR public.is_co_admin());

CREATE POLICY "Admins or co-admin can update announcements"
ON public.announcements FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR public.is_co_admin())
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR public.is_co_admin());

CREATE POLICY "Admins or co-admin can delete announcements"
ON public.announcements FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR public.is_co_admin());

-- FEEDBACK: let the co-admin view and delete
DROP POLICY IF EXISTS "Admins can view feedback" ON public.feedback;
DROP POLICY IF EXISTS "Admins can delete feedback" ON public.feedback;

CREATE POLICY "Admins or co-admin can view feedback"
ON public.feedback FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR public.is_co_admin());

CREATE POLICY "Admins or co-admin can delete feedback"
ON public.feedback FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR public.is_co_admin());
