CREATE TABLE public.tester_chat (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tester_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tester chat"
ON public.tester_chat FOR SELECT
USING (true);

CREATE POLICY "Anyone can post to tester chat"
ON public.tester_chat FOR INSERT
WITH CHECK (
  length(trim(username)) BETWEEN 1 AND 40
  AND length(trim(message)) BETWEEN 1 AND 500
);

CREATE POLICY "Admins can delete tester chat"
ON public.tester_chat FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.tester_chat;
ALTER TABLE public.tester_chat REPLICA IDENTITY FULL;

CREATE INDEX idx_tester_chat_created_at ON public.tester_chat (created_at DESC);