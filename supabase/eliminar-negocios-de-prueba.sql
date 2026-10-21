-- Elimina los negocios de prueba (nombre con "prueba" o "muestra") con sus servicios,
-- planes y miembros. Las cuentas de usuario no se borran.
-- Ejecutar en el SQL Editor de Supabase. Es irreversible: revise primero el PASO 1.

-- PASO 1: vista previa. No modifica nada.
SELECT b.id, b.name, count(s.id) AS servicios
FROM public.businesses AS b
LEFT JOIN public.services AS s ON s.business_id = b.id
WHERE b.name ~* '(prueba|muestra)'
GROUP BY b.id, b.name
ORDER BY b.name;

-- PASO 2: borrado en una transacción. Si algo bloquea el borrado, todo se revierte.
BEGIN;

CREATE TEMP TABLE pv_negocios_a_borrar ON COMMIT DROP AS
SELECT id FROM public.businesses WHERE name ~* '(prueba|muestra)';

-- Las promociones que apuntan a servicios de estos negocios quedan sin servicio destino.
UPDATE public.promotions
SET destination_service_id = NULL
WHERE destination_service_id IN (
  SELECT id FROM public.services
  WHERE business_id IN (SELECT id FROM pv_negocios_a_borrar)
);

DELETE FROM public.services
WHERE business_id IN (SELECT id FROM pv_negocios_a_borrar);

DELETE FROM public.business_service_plans
WHERE business_id IN (SELECT id FROM pv_negocios_a_borrar);

DELETE FROM public.business_members
WHERE business_id IN (SELECT id FROM pv_negocios_a_borrar);

DELETE FROM public.businesses
WHERE id IN (SELECT id FROM pv_negocios_a_borrar);

COMMIT;
