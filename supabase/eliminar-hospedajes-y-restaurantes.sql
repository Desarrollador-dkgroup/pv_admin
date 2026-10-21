-- Elimina TODOS los servicios de hospedaje y restaurantes creados hasta ahora,
-- con sus datos dependientes (habitaciones, menús, fotos, horarios, etc.).
-- Los negocios, sitios turísticos y los demás servicios no se tocan.
-- Ejecutar en el SQL Editor de Supabase. Es irreversible: revisa primero el conteo.

-- PASO 1: vista previa. No modifica nada.
SELECT category_id, count(*) AS servicios
FROM public.services
WHERE category_id IN ('hospedaje', 'restaurantes')
GROUP BY category_id;

-- PASO 2: borrado. Todo ocurre en una transacción: si una tabla bloquea
-- el borrado, se revierte todo y el error indica cuál es.
BEGIN;

CREATE TEMP TABLE pv_servicios_a_borrar ON COMMIT DROP AS
SELECT id FROM public.services
WHERE category_id IN ('hospedaje', 'restaurantes');

-- Las promociones que apuntan a estos servicios quedan sin destino de servicio.
UPDATE public.promotions
SET destination_service_id = NULL
WHERE destination_service_id IN (SELECT id FROM pv_servicios_a_borrar);

-- Las tablas hijas (fotos, habitaciones, menús, horarios, asociaciones con sitios)
-- se borran en cascada. Las que no tengan cascada harán fallar esta sentencia.
DELETE FROM public.services
WHERE id IN (SELECT id FROM pv_servicios_a_borrar);

COMMIT;
