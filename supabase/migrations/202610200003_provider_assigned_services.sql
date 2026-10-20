-- La plataforma asigna cada servicio al comercio. Sus miembros pueden editar
-- los ya asignados, pero no crear uno de otra categoría por cuenta propia.
-- La política restrictiva se combina con las políticas de inserción existentes.
BEGIN;

DROP POLICY IF EXISTS padmin_service_insert_fence ON public.services;
CREATE POLICY padmin_service_insert_fence ON public.services
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_is_admin());

COMMIT;
