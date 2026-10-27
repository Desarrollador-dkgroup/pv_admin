-- Aprobar y publicar las 20 actividades de demostración
-- Ejecutar después de que seed-demo-actividades-panama.sql ha sido ejecutado
-- y las actividades estén en review_status='pending'

BEGIN;

-- Aprobar las 20 actividades (cambiar review_status a 'approved')
UPDATE public.services
SET review_status = 'approved'
WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades' AND review_status = 'pending';

-- Publicar las 20 actividades (cambiar status a 'published')
UPDATE public.services
SET status = 'published'
WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades' AND status = 'draft' AND review_status = 'approved';

-- Verificar que se completó correctamente
DO $$
DECLARE
  v_approved INT;
  v_published INT;
BEGIN
  SELECT COUNT(*) INTO v_approved FROM public.services
  WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades' AND review_status = 'approved';

  SELECT COUNT(*) INTO v_published FROM public.services
  WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades' AND status = 'published';

  RAISE NOTICE 'Aprobadas: %, Publicadas: %', v_approved, v_published;
END $$;

COMMIT;
