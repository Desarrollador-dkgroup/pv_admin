-- Permisos de las tablas de galería y actividades de sitios, iguales a los de tourist_sites.
-- Sin ellos, la web (anon) y el panel (authenticated) no podían leerlas aunque RLS lo
-- permitiera. RLS sigue decidiendo quién escribe: solo los administradores del panel.
-- Idempotente: se puede volver a ejecutar.

GRANT SELECT ON public.tourist_site_photos, public.tourist_site_activities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.tourist_site_photos, public.tourist_site_activities
  TO authenticated;
