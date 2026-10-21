-- Un cupo de hospedaje se materializa como borrador antes de que el propietario elija
-- su plan de comidas. Conserva la validación original para todos los demás casos,
-- especialmente fichas publicadas, y permite solo ese estado incompleto concreto.
-- Este proyecto aplica estas migraciones manualmente en SQL Editor.
BEGIN;

DO $migration$
DECLARE
  v_constraint_oid oid;
  v_original_expression text;
  v_marker constant text := 'pv_admin:allow_incomplete_lodging_drafts:v1';
BEGIN
  SELECT constraint_row.oid,
         pg_get_expr(constraint_row.conbin, constraint_row.conrelid)
    INTO v_constraint_oid, v_original_expression
    FROM pg_constraint AS constraint_row
   WHERE constraint_row.conrelid = 'public.services'::regclass
     AND constraint_row.conname = 'services_hospedaje_fields_match_category'
     AND constraint_row.contype = 'c';

  IF v_constraint_oid IS NULL THEN
    RAISE EXCEPTION 'No existe la restricción de hospedaje esperada; revisar el esquema antes de cambiarlo.';
  END IF;

  IF obj_description(v_constraint_oid, 'pg_constraint') = v_marker THEN
    RETURN;
  END IF;

  -- Si el compañero cambió la regla, no la sustituimos a ciegas.
  IF position('meal_plan_id' IN v_original_expression) = 0
     OR position('hospedaje_type_id' IN v_original_expression) = 0
     OR position('category_id' IN v_original_expression) = 0 THEN
    RAISE EXCEPTION 'La restricción de hospedaje cambió; revisar su expresión antes de aplicar.';
  END IF;

  ALTER TABLE public.services
    DROP CONSTRAINT services_hospedaje_fields_match_category;

  EXECUTE format(
    'ALTER TABLE public.services ADD CONSTRAINT services_hospedaje_fields_match_category '
    || 'CHECK ((%s) OR '
    || '(status = ''draft'' AND category_id = ''hospedaje'' '
    || 'AND hospedaje_type_id IS NOT NULL AND meal_plan_id IS NULL '
    || 'AND base_price_cents IS NULL))',
    v_original_expression
  );

  COMMENT ON CONSTRAINT services_hospedaje_fields_match_category
    ON public.services IS 'pv_admin:allow_incomplete_lodging_drafts:v1';
END;
$migration$;

COMMIT;
