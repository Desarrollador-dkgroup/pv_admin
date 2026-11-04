BEGIN;

-- Sugerencias de visitantes. Solo el equipo las lee desde el panel.
CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 1000),
  is_anonymous boolean NOT NULL DEFAULT true,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (is_anonymous AND author_id IS NULL AND author_name IS NULL)
    OR (NOT is_anonymous AND author_id IS NOT NULL AND author_name IS NOT NULL)
  )
);

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY suggestions_insert ON public.suggestions
FOR INSERT TO anon, authenticated
WITH CHECK (
  (is_anonymous AND author_id IS NULL AND author_name IS NULL)
  OR (NOT is_anonymous AND author_id = auth.uid())
);

GRANT INSERT ON public.suggestions TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
