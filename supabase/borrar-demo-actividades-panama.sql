-- Eliminar todas las actividades de demostración en Panamá.

BEGIN;

DELETE FROM public.activity_hours 
WHERE service_id IN (
  SELECT id FROM public.services 
  WHERE category_id = 'actividades' 
  AND destination_province_id = 'panama'
  AND slug LIKE 'demo-pa-%'
);

DELETE FROM public.activity_profiles 
WHERE service_id IN (
  SELECT id FROM public.services 
  WHERE category_id = 'actividades' 
  AND destination_province_id = 'panama'
  AND slug LIKE 'demo-pa-%'
);

DELETE FROM public.service_photos 
WHERE service_id IN (
  SELECT id FROM public.services 
  WHERE category_id = 'actividades' 
  AND destination_province_id = 'panama'
  AND slug LIKE 'demo-pa-%'
);

DELETE FROM public.reviews 
WHERE service_id IN (
  SELECT id FROM public.services 
  WHERE category_id = 'actividades' 
  AND destination_province_id = 'panama'
  AND slug LIKE 'demo-pa-%'
);

DELETE FROM public.services 
WHERE category_id = 'actividades' 
AND destination_province_id = 'panama'
AND slug LIKE 'demo-pa-%';

COMMIT;
