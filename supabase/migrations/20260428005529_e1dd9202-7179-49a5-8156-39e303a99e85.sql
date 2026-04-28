CREATE TABLE public.game_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  credits TEXT,
  category TEXT,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Game overrides are viewable by everyone"
  ON public.game_overrides FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert game overrides"
  ON public.game_overrides FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update game overrides"
  ON public.game_overrides FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete game overrides"
  ON public.game_overrides FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_game_overrides_updated_at
  BEFORE UPDATE ON public.game_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_custom_games_updated_at();