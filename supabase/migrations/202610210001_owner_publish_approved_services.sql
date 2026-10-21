-- El propietario puede publicar un servicio cuando el equipo ya lo aprobó,
-- y retirarlo como borrador. Idempotente: se puede volver a ejecutar.
BEGIN;

CREATE OR REPLACE FUNCTION public.padmin_protect_service_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.padmin_is_admin() THEN
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
$$;

COMMIT;
