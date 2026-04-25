-- Create featured_games table
CREATE TABLE public.featured_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.featured_games ENABLE ROW LEVEL SECURITY;

-- Anyone (authenticated or anon) can view featured games
CREATE POLICY "Featured games are viewable by everyone"
ON public.featured_games
FOR SELECT
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert featured games"
ON public.featured_games
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update featured games"
ON public.featured_games
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete featured games"
ON public.featured_games
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Index for ordering
CREATE INDEX idx_featured_games_position ON public.featured_games(position);