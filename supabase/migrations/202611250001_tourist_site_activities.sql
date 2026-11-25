-- Actividades de cada sitio turístico («Qué hacer en …»), en el orden del panel.
-- Las leen la guía y la página oficial; el icono lo elige cada web a partir del nombre.
-- Idempotente: se puede volver a ejecutar sin borrar datos.

CREATE TABLE IF NOT EXISTS public.tourist_site_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tourist_site_id uuid NOT NULL REFERENCES public.tourist_sites(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  position smallint NOT NULL CHECK (position BETWEEN 0 AND 39),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tourist_site_activities_position_key UNIQUE (tourist_site_id, position)
);

ALTER TABLE public.tourist_site_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tourist_site_activities_public_read ON public.tourist_site_activities;
CREATE POLICY tourist_site_activities_public_read ON public.tourist_site_activities
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS tourist_site_activities_admin_write ON public.tourist_site_activities;
CREATE POLICY tourist_site_activities_admin_write ON public.tourist_site_activities
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());

-- Reemplaza todas las actividades de un sitio en una sola operación.
-- p_activities es un arreglo JSON de objetos {"name": "...", "description": "..."}.
CREATE OR REPLACE FUNCTION public.padmin_set_tourist_site_activities(
  p_site_id uuid,
  p_activities jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND NOT public.padmin_is_admin() THEN
    RAISE EXCEPTION 'Tu cuenta no puede administrar sitios.';
  END IF;
  IF jsonb_typeof(p_activities) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Las actividades deben enviarse como una lista.';
  END IF;
  IF jsonb_array_length(p_activities) > 40 THEN
    RAISE EXCEPTION 'Un sitio admite hasta 40 actividades.';
  END IF;

  DELETE FROM public.tourist_site_activities WHERE tourist_site_id = p_site_id;

  INSERT INTO public.tourist_site_activities (tourist_site_id, name, description, position)
  SELECT
    p_site_id,
    btrim(item.value ->> 'name'),
    btrim(COALESCE(item.value ->> 'description', '')),
    (item.ord - 1)::smallint
  FROM jsonb_array_elements(p_activities) WITH ORDINALITY AS item(value, ord);
END;
$$;

REVOKE ALL ON FUNCTION public.padmin_set_tourist_site_activities(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_set_tourist_site_activities(uuid, jsonb)
  TO authenticated, service_role;
