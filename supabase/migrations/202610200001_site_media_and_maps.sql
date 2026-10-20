-- Foto y mapa de Google para cada sitio turístico.
-- Idempotente: se puede volver a ejecutar sin borrar datos.

ALTER TABLE public.tourist_sites
  ADD COLUMN IF NOT EXISTS maps_embed_url text;

ALTER TABLE public.tourist_sites
  DROP CONSTRAINT IF EXISTS tourist_sites_maps_embed_url_check;
ALTER TABLE public.tourist_sites
  ADD CONSTRAINT tourist_sites_maps_embed_url_check
  CHECK (maps_embed_url IS NULL OR maps_embed_url LIKE 'https://www.google.com/maps/embed%');

-- Bucket público para las fotos de sitios (máximo 3 MB, JPG, PNG o WebP).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media',
  'site-media',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- La primera carpeta de cada archivo es el identificador del sitio.
DROP POLICY IF EXISTS site_media_public_read ON storage.objects;
CREATE POLICY site_media_public_read ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'site-media');

DROP POLICY IF EXISTS site_media_insert ON storage.objects;
CREATE POLICY site_media_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'site-media'
  AND public.padmin_is_admin()
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

DROP POLICY IF EXISTS site_media_update ON storage.objects;
CREATE POLICY site_media_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'site-media' AND public.padmin_is_admin())
WITH CHECK (bucket_id = 'site-media' AND public.padmin_is_admin());

DROP POLICY IF EXISTS site_media_delete ON storage.objects;
CREATE POLICY site_media_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'site-media' AND public.padmin_is_admin());
