-- Staging table for the TEST page. Mirrors custom_games structure.
CREATE TABLE public.test_custom_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  cover_url text,
  html text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.test_custom_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Test games are viewable by everyone"
  ON public.test_custom_games FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert test games"
  ON public.test_custom_games FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update test games"
  ON public.test_custom_games FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete test games"
  ON public.test_custom_games FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_test_custom_games_updated_at
  BEFORE UPDATE ON public.test_custom_games
  FOR EACH ROW EXECUTE FUNCTION public.update_custom_games_updated_at();

-- Public storage bucket for cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-covers', 'game-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view covers
CREATE POLICY "Game covers are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-covers');

-- Only admins can upload/update/delete covers
CREATE POLICY "Admins can upload game covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'game-covers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can update game covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'game-covers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "Admins can delete game covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'game-covers'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );