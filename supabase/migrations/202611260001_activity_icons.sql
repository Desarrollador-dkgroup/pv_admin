-- Icono elegido para cada actividad de un sitio. NULL = automático: cada web lo elige según
-- el nombre, como hasta ahora. Las claves coinciden con ACTIVITY_ICONS en el panel, la web y
-- la guía; si se añade una, hay que añadirla en los tres y en esta restricción.
-- Idempotente: se puede volver a ejecutar.

ALTER TABLE public.tourist_site_activities
  ADD COLUMN IF NOT EXISTS icon_key text;

ALTER TABLE public.tourist_site_activities
  DROP CONSTRAINT IF EXISTS tourist_site_activities_icon_key_check;
ALTER TABLE public.tourist_site_activities
  ADD CONSTRAINT tourist_site_activities_icon_key_check CHECK (
    icon_key IS NULL OR icon_key IN (
      'playa', 'agua', 'bote', 'pesca', 'bicicleta', 'comida', 'cafe', 'montana', 'bosque',
      'camping', 'estrellas', 'fotografia', 'binoculares', 'aves', 'recorrido', 'cultura',
      'compras', 'isla', 'costa', 'exploracion'
    )
  );

-- Igual que antes, ahora también guarda el icono ("icon": clave o vacío para automático).
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

  INSERT INTO public.tourist_site_activities (
    tourist_site_id, name, description, icon_key, position
  )
  SELECT
    p_site_id,
    btrim(item.value ->> 'name'),
    btrim(COALESCE(item.value ->> 'description', '')),
    NULLIF(btrim(COALESCE(item.value ->> 'icon', '')), ''),
    (item.ord - 1)::smallint
  FROM jsonb_array_elements(p_activities) WITH ORDINALITY AS item(value, ord);
END;
$$;
