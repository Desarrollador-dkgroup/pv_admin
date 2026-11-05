-- Rediseño del panel: aprobar publica y ciclo completo del contrato.

-- 1) «Aprobar y publicar» publica de verdad (también para el colaborador).
CREATE OR REPLACE FUNCTION public.padmin_review_service(
  p_service_id uuid,
  p_decision text,
  p_comment text DEFAULT NULL::text
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
    SET review_status = 'approved', status = 'published', review_comment = NULL
    WHERE id = p_service_id AND review_status = 'pending';
  ELSE
    UPDATE public.services
    SET review_status = 'rejected', status = 'draft', review_comment = btrim(p_comment)
    WHERE id = p_service_id AND review_status = 'pending';
  END IF;

  PERFORM set_config('padmin.reviewing', 'off', true);
END;
$function$;

-- 2) Contrato: copia firmada por verificar, vigente, anulado y versiones.
--    submitted = el negocio subió la copia firmada; signed = el equipo la verificó (vigente).
ALTER TABLE public.business_contracts
  DROP CONSTRAINT IF EXISTS business_contracts_status_check,
  DROP CONSTRAINT IF EXISTS business_contracts_check1,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD CONSTRAINT business_contracts_status_check
    CHECK (status IN ('draft', 'issued', 'submitted', 'signed', 'void')),
  ADD CONSTRAINT business_contracts_signed_pdf_check
    CHECK (status NOT IN ('submitted', 'signed') OR signed_pdf_path IS NOT NULL);

-- Los contratos ya firmados quedan como vigentes y verificados en su fecha de firma.
UPDATE public.business_contracts
SET verified_at = coalesce(verified_at, signed_at)
WHERE status = 'signed';
UPDATE public.business_contracts
SET issued_at = coalesce(issued_at, updated_at)
WHERE status IN ('issued', 'signed');
