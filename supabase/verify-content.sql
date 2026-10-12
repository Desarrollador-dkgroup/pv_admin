-- Confirma que los campos de contenido y precios quedaron creados.
SELECT column_name, data_type, is_generated
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'promotions'
  AND column_name IN (
    'description', 'conditions', 'inclusions', 'exclusions', 'schedule_details',
    'regular_price_cents', 'promotional_price_cents', 'discount_percent', 'currency'
  )
ORDER BY column_name;

-- Debe devolver cero: todos los sitios principales deben tener su asociación.
SELECT count(*) AS missing_primary_links
FROM public.services AS service
WHERE service.tourist_site_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.service_tourist_sites AS link
    WHERE link.service_id = service.id AND link.tourist_site_id = service.tourist_site_id
  );

-- Permite comprobar los descuentos reales después de registrar precios.
SELECT id, title, regular_price_cents, promotional_price_cents, discount_percent
FROM public.promotions
WHERE regular_price_cents IS NOT NULL;
