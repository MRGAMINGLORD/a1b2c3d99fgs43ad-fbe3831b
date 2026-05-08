UPDATE public.site_settings SET defcon_level = LEAST(defcon_level + 1, 5) WHERE id = 'global';
UPDATE public.site_settings SET defcon_level = 5 WHERE id = 'global' AND defcon_level IS NULL;