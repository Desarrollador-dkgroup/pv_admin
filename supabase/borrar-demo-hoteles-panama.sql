-- Borra los hospedajes ficticios creados con seed-demo-hoteles-panama.sql (slug "demo-pa-").
-- Las habitaciones, perfiles, comodidades y vínculos con sitios se borran en cascada.
-- Ojo: el prefijo también incluye los restaurantes de prueba ("demo-pa-rest-").
DELETE FROM public.services WHERE slug LIKE 'demo-pa-%';
