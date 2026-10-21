-- El propietario prepara una ficha borrador para un cupo de su plan (business_service_plans)
-- sin poder exceder la cantidad contratada ni elegir una categoría fuera de su plan.
-- Idempotente: se puede volver a ejecutar sin romper datos existentes.

CREATE OR REPLACE FUNCTION public.owner_create_draft_service(
  p_business_id uuid,
  p_category_id text,
  p_hospedaje_type_id text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_plan_quota integer;
  v_used integer;
  v_category_label text;
  v_slug text;
  v_new_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.business_members AS members
    WHERE members.business_id = p_business_id
      AND members.user_id = (SELECT auth.uid())
      AND members.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'No tienes permiso sobre este negocio.';
  END IF;

  IF public.padmin_is_suspended() THEN
    RAISE EXCEPTION 'Tu cuenta está suspendida.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = p_business_id AND is_active
  ) THEN
    RAISE EXCEPTION 'El negocio está suspendido.';
  END IF;

  IF (p_category_id = 'hospedaje') <> (p_hospedaje_type_id IS NOT NULL) THEN
    RAISE EXCEPTION 'El tipo de hospedaje no coincide con la categoría.';
  END IF;

  -- Bloquea la(s) fila(s) de plan de esta combinación para que dos clics simultáneos no
  -- lean el mismo cupo disponible: el segundo espera a que el primero confirme su inserción
  -- en services antes de volver a contar.
  PERFORM 1
  FROM public.business_service_plans AS plans
  WHERE plans.business_id = p_business_id
    AND plans.category_id = p_category_id
    AND plans.hospedaje_type_id IS NOT DISTINCT FROM p_hospedaje_type_id
  FOR UPDATE;

  SELECT coalesce(sum(plans.quantity), 0) INTO v_plan_quota
  FROM public.business_service_plans AS plans
  WHERE plans.business_id = p_business_id
    AND plans.category_id = p_category_id
    AND plans.hospedaje_type_id IS NOT DISTINCT FROM p_hospedaje_type_id;

  IF v_plan_quota = 0 THEN
    RAISE EXCEPTION 'Esa categoría no está incluida en tu plan.';
  END IF;

  SELECT count(*) INTO v_used
  FROM public.services AS existing
  WHERE existing.business_id = p_business_id
    AND existing.category_id = p_category_id
    AND existing.hospedaje_type_id IS NOT DISTINCT FROM p_hospedaje_type_id;

  IF v_used >= v_plan_quota THEN
    RAISE EXCEPTION 'Ya usaste todos los cupos de este plan.';
  END IF;

  SELECT label INTO v_category_label FROM public.categories WHERE id = p_category_id;
  v_slug := p_category_id || '-' || substr(gen_random_uuid()::text, 1, 8);

  INSERT INTO public.services (
    business_id, category_id, hospedaje_type_id, slug, name,
    search_description, description, status, review_status
  )
  VALUES (
    p_business_id,
    p_category_id,
    p_hospedaje_type_id,
    v_slug,
    coalesce(v_category_label, 'Servicio') || ' sin publicar',
    '',
    '',
    'draft',
    'not_submitted'
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.owner_create_draft_service(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_create_draft_service(uuid, text, text) TO authenticated;
