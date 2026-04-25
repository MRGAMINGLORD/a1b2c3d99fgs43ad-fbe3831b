-- Custom games created by admins via the Admin dashboard.
-- The HTML is stored directly and served via the /play route.
CREATE TABLE public.custom_games (
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

ALTER TABLE public.custom_games ENABLE ROW LEVEL SECURITY;

-- Anyone can view custom games (so they appear on the hub and can be played)
CREATE POLICY "Custom games are viewable by everyone"
  ON public.custom_games FOR SELECT
  USING (true);

-- Only admins can create / edit / delete custom games
CREATE POLICY "Admins can insert custom games"
  ON public.custom_games FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update custom games"
  ON public.custom_games FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete custom games"
  ON public.custom_games FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_custom_games_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_custom_games_updated_at
  BEFORE UPDATE ON public.custom_games
  FOR EACH ROW EXECUTE FUNCTION public.update_custom_games_updated_at();