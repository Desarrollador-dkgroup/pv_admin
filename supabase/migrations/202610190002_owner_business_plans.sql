-- Plan de servicios que el equipo registra al crear un propietario.
-- Idempotente: se puede volver a ejecutar sin romper datos existentes.

CREATE TABLE IF NOT EXISTS public.business_service_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES public.categories(id),
  hospedaje_type_id text REFERENCES public.hospedaje_types(id),
  quantity smallint NOT NULL CHECK (quantity BETWEEN 1 AND 50),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_service_plans_lodging_type
    CHECK ((category_id = 'hospedaje') = (hospedaje_type_id IS NOT NULL))
);

ALTER TABLE public.business_service_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.business_service_plans TO authenticated;

DROP POLICY IF EXISTS business_plans_read ON public.business_service_plans;
CREATE POLICY business_plans_read ON public.business_service_plans
FOR SELECT TO authenticated
USING (
  public.padmin_can_manage_providers()
  OR public.padmin_owns_business(business_id)
);

DROP POLICY IF EXISTS business_plans_insert ON public.business_service_plans;
CREATE POLICY business_plans_insert ON public.business_service_plans
FOR INSERT TO authenticated
WITH CHECK (public.padmin_can_manage_providers());

DROP POLICY IF EXISTS business_plans_delete ON public.business_service_plans;
CREATE POLICY business_plans_delete ON public.business_service_plans
FOR DELETE TO authenticated
USING (public.padmin_can_manage_providers());

-- El propietario edita nombre, ciudad y descripción de su negocio. No cambia si está activo.
CREATE OR REPLACE FUNCTION public.owner_update_business(
  p_business_id uuid,
  p_name text,
  p_description text,
  p_city_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.business_members AS members
    WHERE members.business_id = p_business_id
      AND members.user_id = (SELECT auth.uid())
      AND members.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso para editar este negocio.';
  END IF;

  IF public.padmin_is_suspended() THEN
    RAISE EXCEPTION 'Tu cuenta está suspendida.';
  END IF;

  IF btrim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'El nombre del negocio es obligatorio.';
  END IF;

  UPDATE public.businesses
  SET name = btrim(p_name),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      city_id = p_city_id,
      updated_at = now()
  WHERE id = p_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_update_business(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_update_business(uuid, text, text, text) TO authenticated;
