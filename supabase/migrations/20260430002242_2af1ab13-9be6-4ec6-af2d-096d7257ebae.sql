
-- Site settings (singleton row keyed by id='global')
CREATE TABLE public.site_settings (
  id text PRIMARY KEY DEFAULT 'global',
  defcon_level smallint NOT NULL DEFAULT 4,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings readable by all"
  ON public.site_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site settings"
  ON public.site_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site settings"
  ON public.site_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_settings (id, defcon_level) VALUES ('global', 4)
ON CONFLICT (id) DO NOTHING;

-- Feedback rate limits (server-side only)
CREATE TABLE public.feedback_rate_limits (
  ip text PRIMARY KEY,
  last_submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies => only service role can access.
