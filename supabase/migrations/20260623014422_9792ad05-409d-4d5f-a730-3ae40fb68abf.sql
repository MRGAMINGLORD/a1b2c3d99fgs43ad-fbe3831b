CREATE TABLE public.leaderboard (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_slug TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX leaderboard_game_mode_score_idx
  ON public.leaderboard (game_slug, mode, score DESC, created_at ASC);

GRANT SELECT, INSERT ON public.leaderboard TO anon;
GRANT SELECT, INSERT ON public.leaderboard TO authenticated;
GRANT ALL ON public.leaderboard TO service_role;

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard is publicly readable"
  ON public.leaderboard FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit a leaderboard entry"
  ON public.leaderboard FOR INSERT
  WITH CHECK (
    score >= 0
    AND score <= 100000000
    AND char_length(trim(name)) BETWEEN 1 AND 20
    AND char_length(game_slug) BETWEEN 1 AND 64
    AND char_length(mode) BETWEEN 1 AND 32
  );
