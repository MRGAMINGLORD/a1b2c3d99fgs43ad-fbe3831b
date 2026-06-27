DROP POLICY IF EXISTS "Authenticated users can submit scores" ON public.leaderboard;
CREATE POLICY "Anyone can submit scores"
ON public.leaderboard
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(coalesce(name,'')) BETWEEN 1 AND 24
  AND char_length(coalesce(game_slug,'')) BETWEEN 1 AND 64
  AND char_length(coalesce(mode,'')) BETWEEN 1 AND 32
  AND score >= 0 AND score <= 10000000
);
GRANT INSERT ON public.leaderboard TO anon;