-- Elimina el negocio "Negocio de Propietario1" con sus planes y miembros.
-- La cuenta de usuario no se borra. Ejecutar en el SQL Editor de Supabase.

-- PASO 1: vista previa. No modifica nada.
SELECT b.id, b.name, count(s.id) AS servicios
FROM public.businesses AS b
LEFT JOIN public.services AS s ON s.business_id = b.id
WHERE b.name = 'Negocio de Propietario1'
GROUP BY b.id, b.name;

-- PASO 2: borrado en una transacción.
BEGIN;

CREATE TEMP TABLE pv_negocio_a_borrar ON COMMIT DROP AS
SELECT id FROM public.businesses WHERE name = 'Negocio de Propietario1';

UPDATE public.promotions
SET destination_service_id = NULL
WHERE destination_service_id IN (
  SELECT id FROM public.services
  WHERE business_id IN (SELECT id FROM pv_negocio_a_borrar)
);

DELETE FROM public.services
WHERE business_id IN (SELECT id FROM pv_negocio_a_borrar);

DELETE FROM public.business_service_plans
WHERE business_id IN (SELECT id FROM pv_negocio_a_borrar);

DELETE FROM public.business_members
WHERE business_id IN (SELECT id FROM pv_negocio_a_borrar);

DELETE FROM public.businesses
WHERE id IN (SELECT id FROM pv_negocio_a_borrar);

COMMIT;
