-- Borra los restaurantes ficticios de seed-demo-restaurantes-panama.sql (slug "demo-pa-rest-")
-- y quita sus vínculos de los hoteles. Perfiles, horarios y menús se borran en cascada.
BEGIN;

UPDATE public.lodging_profiles
SET details = details - 'linked_restaurant_ids'
WHERE details ? 'linked_restaurant_ids'
  AND service_id IN (SELECT id FROM public.services WHERE slug LIKE 'demo-pa-%');

DELETE FROM public.services WHERE slug LIKE 'demo-pa-rest-%';

COMMIT;
