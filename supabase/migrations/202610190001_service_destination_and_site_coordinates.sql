-- Coordenadas de cada sitio turístico y destino elegido por cada servicio.
-- Idempotente: se puede volver a ejecutar sin romper datos existentes.

ALTER TABLE public.tourist_sites
  ADD COLUMN IF NOT EXISTS latitude numeric(9, 6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9, 6);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tourist_sites_latitude_range'
  ) THEN
    ALTER TABLE public.tourist_sites
      ADD CONSTRAINT tourist_sites_latitude_range
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tourist_sites_longitude_range'
  ) THEN
    ALTER TABLE public.tourist_sites
      ADD CONSTRAINT tourist_sites_longitude_range
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
  END IF;
END $$;

-- Destino (provincia) que el negocio eligió para su servicio.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS destination_province_id text REFERENCES public.provinces(id);

CREATE INDEX IF NOT EXISTS services_destination_province_idx
  ON public.services(destination_province_id);
