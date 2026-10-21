-- El propietario crea servicios de su negocio solo dentro del plan asignado por el equipo
-- (categoría, tipo de hospedaje y cantidad). El equipo no tiene límite.
-- Idempotente: se puede volver a ejecutar.
BEGIN;

CREATE OR REPLACE FUNCTION public.padmin_can_create_service(
  p_business_id uuid,
  p_category_id text,
  p_hospedaje_type_id text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  allowed integer;
  used integer;
BEGIN
  IF public.padmin_is_admin() THEN
    RETURN true;
  END IF;

  IF NOT public.padmin_owns_business(p_business_id) THEN
    RETURN false;
  END IF;

  SELECT coalesce(sum(plan.quantity), 0) INTO allowed
  FROM public.business_service_plans AS plan
  WHERE plan.business_id = p_business_id
    AND plan.category_id = p_category_id
    AND plan.hospedaje_type_id IS NOT DISTINCT FROM p_hospedaje_type_id;

  IF allowed = 0 THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO used
  FROM public.services AS s
  WHERE s.business_id = p_business_id
    AND s.category_id = p_category_id
    AND s.hospedaje_type_id IS NOT DISTINCT FROM p_hospedaje_type_id;

  RETURN used < allowed;
END;
$$;

REVOKE ALL ON FUNCTION public.padmin_can_create_service(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_can_create_service(uuid, text, text) TO authenticated;

-- Sustituye el bloqueo anterior: ahora el propietario puede insertar, pero dentro de su plan.
DROP POLICY IF EXISTS padmin_service_insert_fence ON public.services;
CREATE POLICY padmin_service_insert_fence ON public.services
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_can_create_service(business_id, category_id, hospedaje_type_id));

COMMIT;
