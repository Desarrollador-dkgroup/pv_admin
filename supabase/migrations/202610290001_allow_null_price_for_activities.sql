-- Permite que las actividades tengan precio opcional (NULL).
-- Solo restaurantes requieren precio; hospedajes nunca tienen precio.

BEGIN;

ALTER TABLE public.services
  DROP CONSTRAINT services_price_matches_category;

ALTER TABLE public.services
  ADD CONSTRAINT services_price_matches_category
    CHECK (
      (category_id = 'hospedaje'::text) = (base_price_cents IS NULL)
      OR category_id = 'actividades'::text
    );

COMMENT ON CONSTRAINT services_price_matches_category
  ON public.services IS
  'Validación de precio por categoría: hospedaje sin precio, restaurantes con precio, actividades opcional.';

NOTIFY pgrst, 'reload schema';
COMMIT;
