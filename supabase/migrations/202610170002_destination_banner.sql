-- Cada destino tiene dos imágenes: la de la tarjeta y la del banner de su página.
-- Idempotente: se puede volver a ejecutar sin romper datos existentes.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'destinations'
      AND column_name = 'image_storage_path'
  ) THEN
    ALTER TABLE public.destinations
      RENAME COLUMN image_storage_path TO card_image_storage_path;
  END IF;
END $$;

ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS card_image_storage_path text,
  ADD COLUMN IF NOT EXISTS banner_image_storage_path text;
