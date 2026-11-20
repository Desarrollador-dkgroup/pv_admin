-- Galería de fotos de cada sitio turístico. La foto en la posición 0 es la portada y se copia
-- en tourist_sites.photo_storage_path, que siguen leyendo las tarjetas, la búsqueda y la app.
-- Idempotente: se puede volver a ejecutar sin borrar datos.

CREATE TABLE IF NOT EXISTS public.tourist_site_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_site_id uuid NOT NULL REFERENCES public.tourist_sites(id) ON DELETE CASCADE,
  storage_path text NOT NULL CHECK (btrim(storage_path) <> ''),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 29),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tourist_site_photos_position_key UNIQUE (tourist_site_id, position),
  CONSTRAINT tourist_site_photos_path_key UNIQUE (tourist_site_id, storage_path)
);

ALTER TABLE public.tourist_site_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tourist_site_photos_public_read ON public.tourist_site_photos;
CREATE POLICY tourist_site_photos_public_read ON public.tourist_site_photos
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS tourist_site_photos_admin_write ON public.tourist_site_photos;
CREATE POLICY tourist_site_photos_admin_write ON public.tourist_site_photos
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());

-- Reemplaza la galería completa de un sitio y actualiza su portada en una sola operación.
-- La usan el panel (admins) y el script de migración de la guía (service_role).
CREATE OR REPLACE FUNCTION public.padmin_set_tourist_site_photos(
  p_site_id uuid,
  p_paths text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.padmin_is_admin() THEN
    RAISE EXCEPTION 'Tu cuenta no puede administrar sitios.';
  END IF;
  IF COALESCE(array_length(p_paths, 1), 0) > 30 THEN
    RAISE EXCEPTION 'Un sitio admite hasta 30 fotos.';
  END IF;

  DELETE FROM public.tourist_site_photos WHERE tourist_site_id = p_site_id;

  INSERT INTO public.tourist_site_photos (tourist_site_id, storage_path, position)
  SELECT p_site_id, photo.path, (photo.ord - 1)::smallint
  FROM unnest(p_paths) WITH ORDINALITY AS photo(path, ord);

  UPDATE public.tourist_sites
  SET photo_storage_path = p_paths[1], updated_at = now()
  WHERE id = p_site_id;
END;
$$;

REVOKE ALL ON FUNCTION public.padmin_set_tourist_site_photos(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_set_tourist_site_photos(uuid, text[])
  TO authenticated, service_role;

-- La portada actual de cada sitio pasa a ser la primera foto de su galería.
INSERT INTO public.tourist_site_photos (tourist_site_id, storage_path, position)
SELECT id, photo_storage_path, 0
FROM public.tourist_sites
WHERE photo_storage_path IS NOT NULL AND btrim(photo_storage_path) <> ''
ON CONFLICT DO NOTHING;

-- Las fotos de la guía pesan hasta 10 MB; el bucket de sitios acepta ese tamaño.
UPDATE storage.buckets SET file_size_limit = 10485760 WHERE id = 'site-media';
