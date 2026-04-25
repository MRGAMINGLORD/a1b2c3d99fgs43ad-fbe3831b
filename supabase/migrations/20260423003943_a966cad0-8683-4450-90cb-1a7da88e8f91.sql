DROP POLICY IF EXISTS "Admins can update featured games" ON public.featured_games;

CREATE POLICY "Admins can update featured games"
ON public.featured_games
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));