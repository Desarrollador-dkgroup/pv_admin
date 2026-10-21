-- El trigger valida city_id contra la provincia. Como los sitios ya no tienen ciudad
-- de referencia, se elimina el trigger y su función.
-- Idempotente: se puede volver a ejecutar sin errores.

DROP TRIGGER IF EXISTS tourist_sites_enforce_city_province ON public.tourist_sites;
DROP FUNCTION IF EXISTS public.enforce_tourist_site_city_province();

-- Las referencias de ciudad y coordenadas de esta tabla ya no forman parte
-- del catálogo. Se eliminan antes de quitar la tabla cities en 202610200005.
ALTER TABLE public.tourist_sites DROP COLUMN IF EXISTS city_id;
ALTER TABLE public.tourist_sites DROP COLUMN IF EXISTS latitude;
ALTER TABLE public.tourist_sites DROP COLUMN IF EXISTS longitude;
