-- Servicios: el destino reemplaza a la ciudad, se quitan el área y las coordenadas,
-- y la consulta del mapa pasa a ser el código de Google Maps.
-- Idempotente: se puede volver a ejecutar sin romper datos existentes.

-- La ciudad ya no se pide en el formulario.
ALTER TABLE public.services ALTER COLUMN city_id DROP NOT NULL;

-- Campos que ya no se usan en el formulario ni en la web.
ALTER TABLE public.services DROP COLUMN IF EXISTS area_label;
ALTER TABLE public.services DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.services DROP COLUMN IF EXISTS longitude;
ALTER TABLE public.services DROP COLUMN IF EXISTS latitude_delta;
ALTER TABLE public.services DROP COLUMN IF EXISTS longitude_delta;

-- maps_query pasa a guardar el código de Google Maps (URL de inserción).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'maps_query'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'maps_embed_url'
  ) THEN
    ALTER TABLE public.services RENAME COLUMN maps_query TO maps_embed_url;
  END IF;
END $$;

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS maps_embed_url text;

-- Un texto de búsqueda anterior no es un mapa válido; se limpia para que la validación aplique.
UPDATE public.services
SET maps_embed_url = NULL
WHERE maps_embed_url IS NOT NULL
  AND maps_embed_url NOT LIKE 'https://www.google.com/maps/embed%';

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_maps_embed_url_check;
ALTER TABLE public.services ADD CONSTRAINT services_maps_embed_url_check
  CHECK (maps_embed_url IS NULL OR maps_embed_url LIKE 'https://www.google.com/maps/embed%');
