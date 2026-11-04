BEGIN;

-- Apellido del cliente, separado del nombre que se muestra en la app.
ALTER TABLE public.profiles
  ADD COLUMN last_name text CHECK (last_name IS NULL OR char_length(last_name) BETWEEN 1 AND 80);

NOTIFY pgrst, 'reload schema';
COMMIT;
