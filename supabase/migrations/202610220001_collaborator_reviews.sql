-- El colaborador también revisa servicios: puede aprobarlos o devolverlos con correcciones.
-- No obtiene acceso de edición al servicio: solo cambia los campos de revisión mediante
-- padmin_review_service. Idempotente: se puede volver a ejecutar.

BEGIN;

-- Revisa un servicio pendiente. Lo usa el colaborador, que no pasa las políticas de
-- edición de services. La decisión es 'approved' o 'rejected' (con comentario).
CREATE OR REPLACE FUNCTION public.padmin_review_service(
  p_service_id uuid,
  p_decision text,
  p_comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF NOT public.padmin_can_manage_providers() THEN
    RAISE EXCEPTION 'Tu cuenta no tiene permiso para revisar servicios.';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decisión de revisión no válida.';
  END IF;
  IF p_decision = 'rejected' AND coalesce(btrim(p_comment), '') = '' THEN
    RAISE EXCEPTION 'Escribe el motivo para que el negocio pueda corregirlo.';
  END IF;

  -- Marca la transacción para que padmin_protect_service_review acepte el cambio.
  PERFORM set_config('padmin.reviewing', 'on', true);

  IF p_decision = 'approved' THEN
    UPDATE public.services
    SET review_status = 'approved', review_comment = NULL
    WHERE id = p_service_id AND review_status = 'pending';
  ELSE
    UPDATE public.services
    SET review_status = 'rejected', status = 'draft', review_comment = btrim(p_comment)
    WHERE id = p_service_id AND review_status = 'pending';
  END IF;

  PERFORM set_config('padmin.reviewing', 'off', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.padmin_review_service(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_review_service(uuid, text, text) TO authenticated;

-- Igual que la versión de 202610210001, pero acepta los cambios hechos por
-- padmin_review_service.
CREATE OR REPLACE FUNCTION public.padmin_protect_service_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF public.padmin_is_admin()
    OR current_setting('padmin.reviewing', true) = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar el negocio del servicio.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
      AND NEW.status <> 'draft'
      AND NOT (NEW.status = 'published' AND NEW.review_status = 'approved') THEN
      RAISE EXCEPTION 'El propietario solo puede publicar servicios aprobados o retirarlos.';
    END IF;

    IF NEW.is_recommended IS DISTINCT FROM OLD.is_recommended
      OR NEW.review_comment IS DISTINCT FROM OLD.review_comment THEN
      RAISE EXCEPTION 'Solo un administrador puede publicar o moderar servicios.';
    END IF;

    IF NEW.review_status IS DISTINCT FROM OLD.review_status
      AND NEW.review_status NOT IN ('pending', 'not_submitted') THEN
      RAISE EXCEPTION 'El propietario no puede aprobar ni rechazar sus cambios.';
    END IF;
  ELSIF NEW.status <> 'draft' OR NEW.is_recommended THEN
    RAISE EXCEPTION 'Los servicios nuevos empiezan como borrador.';
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
