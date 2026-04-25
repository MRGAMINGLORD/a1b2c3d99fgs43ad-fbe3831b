-- 1) Optional game tag for patch notes
ALTER TABLE public.patch_notes
  ADD COLUMN IF NOT EXISTS game_id text;

CREATE INDEX IF NOT EXISTS patch_notes_game_id_idx
  ON public.patch_notes (game_id);

-- 2) Public storage bucket for custom game files
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-files', 'game-files', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Game files are publicly readable" ON storage.objects;
CREATE POLICY "Game files are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'game-files');

-- Admin write/update/delete
DROP POLICY IF EXISTS "Admins can upload game files" ON storage.objects;
CREATE POLICY "Admins can upload game files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'game-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update game files" ON storage.objects;
CREATE POLICY "Admins can update game files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'game-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete game files" ON storage.objects;
CREATE POLICY "Admins can delete game files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'game-files' AND public.has_role(auth.uid(), 'admin'::public.app_role));