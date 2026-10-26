-- Borra los hospedajes ficticios creados con seed-demo-hoteles-panama.sql (slug "demo-pa-").
-- Las habitaciones, perfiles, comodidades y vínculos con sitios se borran en cascada.
DELETE FROM public.services WHERE slug LIKE 'demo-pa-%';
