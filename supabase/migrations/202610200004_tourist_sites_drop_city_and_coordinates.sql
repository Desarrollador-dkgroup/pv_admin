-- Sitios turísticos: se quitan la ciudad de referencia y las coordenadas.
-- El destino (provincia) sigue siendo la referencia de cada sitio.
-- Idempotente: se puede volver a ejecutar sin romper datos.

ALTER TABLE public.tourist_sites DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.tourist_sites DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.tourist_sites DROP COLUMN IF EXISTS longitude;
