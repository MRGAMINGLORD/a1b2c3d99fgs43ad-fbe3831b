ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'website';

ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_category_length CHECK (char_length(category) > 0 AND char_length(category) <= 50);