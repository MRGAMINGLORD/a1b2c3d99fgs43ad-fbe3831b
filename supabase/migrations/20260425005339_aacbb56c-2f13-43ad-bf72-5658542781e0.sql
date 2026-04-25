-- 1. Grant EXECUTE on has_role so RLS policies on feedback/announcements can call it
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- 2. Patch notes table — admin-managed, publicly readable
CREATE TABLE public.patch_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.patch_notes ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon visitors) can read patch notes
CREATE POLICY "Patch notes are publicly readable"
  ON public.patch_notes
  FOR SELECT
  USING (true);

-- Only admins can create/update/delete patch notes
CREATE POLICY "Admins can insert patch notes"
  ON public.patch_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update patch notes"
  ON public.patch_notes
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete patch notes"
  ON public.patch_notes
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_patch_notes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER patch_notes_set_updated_at
  BEFORE UPDATE ON public.patch_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_patch_notes_updated_at();