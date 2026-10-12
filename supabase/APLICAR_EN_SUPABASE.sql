-- Ejecutar una sola vez en la base compartida por ambas aplicaciones.
BEGIN;

-- Añade contenido real sin inventar valores para las promociones existentes.
ALTER TABLE public.promotions
  ADD COLUMN description text,
  ADD COLUMN conditions text,
  ADD COLUMN inclusions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN exclusions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN schedule_details text,
  ADD COLUMN regular_price_cents bigint,
  ADD COLUMN promotional_price_cents bigint,
  ADD COLUMN currency text NOT NULL DEFAULT 'USD';

-- Calcula el porcentaje desde los precios para evitar valores contradictorios.
ALTER TABLE public.promotions
  ADD COLUMN discount_percent numeric GENERATED ALWAYS AS (
    CASE WHEN regular_price_cents > 0 AND promotional_price_cents IS NOT NULL
      THEN round(
        (regular_price_cents - promotional_price_cents)::numeric
        * 100 / regular_price_cents,
        2
      )
      ELSE NULL
    END
  ) STORED,
  ADD CONSTRAINT promotions_prices_check CHECK (
    (regular_price_cents IS NULL AND promotional_price_cents IS NULL)
    OR (
      regular_price_cents IS NOT NULL
      AND promotional_price_cents IS NOT NULL
      AND regular_price_cents > 0
      AND promotional_price_cents >= 0
      AND promotional_price_cents <= regular_price_cents
    )
  ),
  ADD CONSTRAINT promotions_currency_check CHECK (currency = 'USD');

COMMENT ON COLUMN public.promotions.regular_price_cents IS
  'Precio regular en centavos; 10000 representa USD 100.00.';
COMMENT ON COLUMN public.promotions.promotional_price_cents IS
  'Precio final de la oferta en centavos.';
COMMENT ON COLUMN public.promotions.discount_percent IS
  'Porcentaje calculado automáticamente; no se escribe desde el formulario.';

-- Relaciona cada servicio con varios sitios sin duplicar el propio servicio.
CREATE TABLE public.service_tourist_sites (
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  tourist_site_id uuid NOT NULL REFERENCES public.tourist_sites(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (service_id, tourist_site_id)
);

CREATE INDEX service_tourist_sites_site_idx
  ON public.service_tourist_sites(tourist_site_id, service_id);

-- Conserva las asociaciones actuales y mantiene el sitio principal por compatibilidad.
INSERT INTO public.service_tourist_sites (service_id, tourist_site_id)
SELECT id, tourist_site_id FROM public.services WHERE tourist_site_id IS NOT NULL;

-- Sincroniza solo la ubicación principal de una escritura ya autorizada en services.
CREATE FUNCTION public.sync_primary_service_site()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.tourist_site_id IS NOT DISTINCT FROM NEW.tourist_site_id THEN
      RETURN NEW;
    END IF;

    DELETE FROM public.service_tourist_sites
    WHERE service_id = NEW.id AND tourist_site_id = OLD.tourist_site_id;
  END IF;

  IF NEW.tourist_site_id IS NOT NULL THEN
    INSERT INTO public.service_tourist_sites (service_id, tourist_site_id)
    VALUES (NEW.id, NEW.tourist_site_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER services_sync_primary_site
AFTER INSERT OR UPDATE OF tourist_site_id ON public.services
FOR EACH ROW EXECUTE FUNCTION public.sync_primary_service_site();

-- Activa la protección de la tabla nueva sin modificar los permisos existentes.
ALTER TABLE public.service_tourist_sites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.service_tourist_sites FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.service_tourist_sites TO anon, authenticated;

-- La lectura pública solo revela asociaciones de servicios publicados y visibles.
CREATE POLICY service_sites_public_read ON public.service_tourist_sites
FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.services
    WHERE services.id = service_tourist_sites.service_id
      AND services.status = 'published'
  )
);

NOTIFY pgrst, 'reload schema';
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
