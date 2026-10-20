-- Destinos del panel: una tarjeta por provincia, con imagen, descripción y mapa de Google.
-- Idempotente: se puede volver a ejecutar sin romper datos existentes.

CREATE TABLE IF NOT EXISTS public.destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  subtitle text CHECK (subtitle IS NULL OR char_length(subtitle) <= 120),
  description text,
  image_storage_path text,
  maps_embed_url text CHECK (
    maps_embed_url IS NULL OR maps_embed_url LIKE 'https://www.google.com/maps/embed%'
  ),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.destinations TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.destinations TO authenticated;

DROP POLICY IF EXISTS destinations_public_read ON public.destinations;
CREATE POLICY destinations_public_read ON public.destinations
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS destinations_admin_write ON public.destinations;
CREATE POLICY destinations_admin_write ON public.destinations
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());

-- Bucket público para las imágenes de destinos (máximo 3 MB, JPG, PNG o WebP).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'destination-media',
  'destination-media',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- La primera carpeta de cada archivo es el identificador del destino.
DROP POLICY IF EXISTS destination_media_public_read ON storage.objects;
CREATE POLICY destination_media_public_read ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'destination-media');

DROP POLICY IF EXISTS destination_media_insert ON storage.objects;
CREATE POLICY destination_media_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'destination-media'
  AND public.padmin_is_admin()
  AND (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
);

DROP POLICY IF EXISTS destination_media_update ON storage.objects;
CREATE POLICY destination_media_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'destination-media' AND public.padmin_is_admin())
WITH CHECK (bucket_id = 'destination-media' AND public.padmin_is_admin());

DROP POLICY IF EXISTS destination_media_delete ON storage.objects;
CREATE POLICY destination_media_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'destination-media' AND public.padmin_is_admin());
