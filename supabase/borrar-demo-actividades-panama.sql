-- Borra las 20 actividades ficticias de demostración creadas con seed-demo-actividades-panama.sql.
-- Se identifican por el patrón de slug 'demo-pa-' y categoría 'actividades'.

BEGIN;

DELETE FROM public.activity_profiles
  WHERE service_id IN (
    SELECT id FROM public.services
    WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades'
  );

DELETE FROM public.service_amenities
  WHERE service_id IN (
    SELECT id FROM public.services
    WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades'
  );

DELETE FROM public.services
  WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades';

COMMIT;
