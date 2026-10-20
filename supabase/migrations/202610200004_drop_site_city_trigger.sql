-- El trigger valida city_id contra la provincia. Como los sitios ya no tienen ciudad
-- de referencia, se elimina el trigger y su función.
-- Idempotente: se puede volver a ejecutar sin errores.

DROP TRIGGER IF EXISTS tourist_sites_enforce_city_province ON public.tourist_sites;
DROP FUNCTION IF EXISTS public.enforce_tourist_site_city_province();
