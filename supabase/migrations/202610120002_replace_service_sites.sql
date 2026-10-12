BEGIN;

-- Sustituye todas las asociaciones en una transacción y conserva un sitio principal.
CREATE FUNCTION public.set_service_tourist_sites(
  p_service_id uuid,
  p_tourist_site_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_tourist_site_ids IS NULL
    OR array_position(p_tourist_site_ids, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'La lista de sitios no puede ser nula ni contener valores nulos.';
  END IF;

  -- Serializa las modificaciones del mismo servicio para evitar actualizaciones parciales.
  PERFORM 1 FROM public.services WHERE id = p_service_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El servicio no existe o no está disponible.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_tourist_site_ids) AS requested(id)
    WHERE NOT EXISTS (SELECT 1 FROM public.tourist_sites WHERE tourist_sites.id = requested.id)
  ) THEN
    RAISE EXCEPTION 'Uno de los sitios turísticos no existe o no está disponible.';
  END IF;

  -- El primer sitio seleccionado representa la ubicación principal.
  UPDATE public.services SET tourist_site_id = p_tourist_site_ids[1]
  WHERE id = p_service_id;

  DELETE FROM public.service_tourist_sites WHERE service_id = p_service_id;
  INSERT INTO public.service_tourist_sites (service_id, tourist_site_id)
  SELECT p_service_id, site_id FROM unnest(p_tourist_site_ids) AS selected(site_id)
  GROUP BY site_id;
END;
$$;

-- El acceso de escritura se definirá junto con los roles del padmin.
REVOKE ALL ON FUNCTION public.set_service_tourist_sites(uuid, uuid[])
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_primary_service_site()
FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
