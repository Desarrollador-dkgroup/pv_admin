-- Publicar todas las actividades de demostración
-- Ejecutar después de seed-demo-actividades-panama.sql

UPDATE public.services
SET status = 'published', review_status = 'approved'
WHERE slug LIKE 'demo-pa-%' AND category_id = 'actividades' AND status = 'draft';
