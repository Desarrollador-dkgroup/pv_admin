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

-- Amplía la ubicación exacta del servicio sin reemplazar ciudad ni coordenadas.
ALTER TABLE public.services
  ADD COLUMN address text;

COMMENT ON COLUMN public.services.address IS
  'Dirección física exacta del servicio; no sustituye ciudad ni sitios turísticos.';

-- Guarda los datos operativos comunes de los hospedajes.
CREATE TABLE public.lodging_profiles (
  service_id uuid PRIMARY KEY
    REFERENCES public.services(id) ON DELETE CASCADE,
  contact_phone text,
  contact_email text,
  website_url text,
  check_in_from time without time zone,
  check_in_to time without time zone,
  check_out_time time without time zone,
  reception_hours text,
  arrival_method text,
  arrival_instructions text,
  languages text[] NOT NULL DEFAULT '{}',
  meal_service_details text,
  parking_details text,
  accessibility_details text,
  wifi_details text,
  water_details text,
  energy_details text,
  seasonal_conditions text,
  guest_rules text,
  pet_policy text,
  smoking_policy text,
  events_policy text,
  cancellation_policy text,
  tourism_registration_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lodging_profiles_check_in_check CHECK (
    check_in_from IS NULL
    OR check_in_to IS NULL
    OR check_in_from < check_in_to
  )
);

COMMENT ON TABLE public.lodging_profiles IS
  'Información operativa compartida por hoteles y demás tipos de hospedaje.';

-- Crea perfiles vacíos para hospedajes ya registrados, sin inventar sus datos.
INSERT INTO public.lodging_profiles (service_id)
SELECT id
FROM public.services
WHERE hospedaje_type_id IS NOT NULL
ON CONFLICT (service_id) DO NOTHING;

-- Completa los datos de cada habitación, cama, unidad o parcela reservable.
ALTER TABLE public.room_types
  ADD COLUMN booking_unit text NOT NULL DEFAULT 'room',
  ADD COLUMN bedroom_count smallint,
  ADD COLUMN bathroom_count numeric(4, 1),
  ADD COLUMN area_m2 numeric(8, 2),
  ADD CONSTRAINT room_types_booking_unit_check CHECK (
    booking_unit IN ('room', 'bed', 'unit', 'site')
  ),
  ADD CONSTRAINT room_types_bedroom_count_check CHECK (
    bedroom_count IS NULL OR bedroom_count >= 0
  ),
  ADD CONSTRAINT room_types_bathroom_count_check CHECK (
    bathroom_count IS NULL OR bathroom_count >= 0
  ),
  ADD CONSTRAINT room_types_area_m2_check CHECK (
    area_m2 IS NULL OR area_m2 > 0
  );

COMMENT ON COLUMN public.room_types.booking_unit IS
  'Unidad reservable: habitación, cama, unidad completa o parcela.';

-- Describe áreas como piscinas, estacionamientos, parques y espacios comunes.
CREATE TABLE public.lodging_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  description text,
  is_available boolean NOT NULL DEFAULT true,
  opening_hours text,
  capacity smallint CHECK (capacity IS NULL OR capacity > 0),
  included_in_rate boolean,
  additional_price_cents bigint CHECK (
    additional_price_cents IS NULL OR additional_price_cents >= 0
  ),
  access_details text,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lodging_areas_service_name_key UNIQUE (service_id, name),
  CONSTRAINT lodging_areas_id_service_key UNIQUE (id, service_id)
);

CREATE INDEX lodging_areas_service_position_idx
  ON public.lodging_areas(service_id, position, name);

-- Actualiza automáticamente la fecha de modificación de los perfiles y áreas.
CREATE FUNCTION public.touch_lodging_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lodging_profiles_touch_updated_at
BEFORE UPDATE ON public.lodging_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_lodging_updated_at();

CREATE TRIGGER lodging_areas_touch_updated_at
BEFORE UPDATE ON public.lodging_areas
FOR EACH ROW EXECUTE FUNCTION public.touch_lodging_updated_at();

-- Evita asociar áreas físicas a servicios que no son hospedajes.
CREATE FUNCTION public.validate_lodging_area_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hospedaje_type_id text;
BEGIN
  SELECT services.hospedaje_type_id
  INTO v_hospedaje_type_id
  FROM public.services AS services
  WHERE services.id = NEW.service_id
  FOR UPDATE;

  IF NOT FOUND OR v_hospedaje_type_id IS NULL THEN
    RAISE EXCEPTION 'Las áreas solo pueden pertenecer a un hospedaje.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER lodging_areas_validate_service
BEFORE INSERT OR UPDATE OF service_id ON public.lodging_areas
FOR EACH ROW EXECUTE FUNCTION public.validate_lodging_area_service();

-- Añade a cada foto una asociación opcional con un área del hospedaje.
ALTER TABLE public.service_photos
  ADD COLUMN lodging_area_id uuid,
  ADD CONSTRAINT service_photos_area_service_fkey
    FOREIGN KEY (lodging_area_id, service_id)
    REFERENCES public.lodging_areas(id, service_id)
    ON DELETE CASCADE;

CREATE INDEX service_photos_area_position_idx
  ON public.service_photos(lodging_area_id, position)
  WHERE lodging_area_id IS NOT NULL;

-- Limita a una imagen de portada la galería general y cada área.
CREATE UNIQUE INDEX service_photos_one_general_cover_idx
  ON public.service_photos(service_id)
  WHERE is_cover AND lodging_area_id IS NULL;

CREATE UNIQUE INDEX service_photos_one_area_cover_idx
  ON public.service_photos(lodging_area_id)
  WHERE is_cover AND lodging_area_id IS NOT NULL;

-- Marca una sola portada para cada tipo de habitación o unidad.
ALTER TABLE public.room_type_photos
  ADD COLUMN is_cover boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX room_type_photos_one_cover_idx
  ON public.room_type_photos(room_type_id)
  WHERE is_cover;

-- Agrega reglas de reserva configurables para cada restaurante.
ALTER TABLE public.restaurant_profiles
  ADD COLUMN accepts_reservations boolean NOT NULL DEFAULT true,
  ADD COLUMN reservation_requires_confirmation boolean NOT NULL DEFAULT true,
  ADD COLUMN reservation_duration_minutes smallint,
  ADD COLUMN reservation_min_party_size smallint,
  ADD COLUMN reservation_max_party_size smallint,
  ADD COLUMN reservation_min_advance_minutes integer,
  ADD COLUMN reservation_max_days_ahead smallint,
  ADD COLUMN reservation_capacity_per_slot smallint,
  ADD COLUMN reservation_cancellation_cutoff_minutes integer,
  ADD COLUMN reservation_policy text,
  ADD CONSTRAINT restaurant_profiles_duration_check CHECK (
    reservation_duration_minutes IS NULL
    OR reservation_duration_minutes BETWEEN 15 AND 720
  ),
  ADD CONSTRAINT restaurant_profiles_min_party_check CHECK (
    reservation_min_party_size IS NULL OR reservation_min_party_size >= 1
  ),
  ADD CONSTRAINT restaurant_profiles_max_party_check CHECK (
    reservation_max_party_size IS NULL OR reservation_max_party_size >= 1
  ),
  ADD CONSTRAINT restaurant_profiles_party_range_check CHECK (
    reservation_min_party_size IS NULL
    OR reservation_max_party_size IS NULL
    OR reservation_min_party_size <= reservation_max_party_size
  ),
  ADD CONSTRAINT restaurant_profiles_min_advance_check CHECK (
    reservation_min_advance_minutes IS NULL
    OR reservation_min_advance_minutes >= 0
  ),
  ADD CONSTRAINT restaurant_profiles_max_days_check CHECK (
    reservation_max_days_ahead IS NULL OR reservation_max_days_ahead >= 0
  ),
  ADD CONSTRAINT restaurant_profiles_capacity_check CHECK (
    reservation_capacity_per_slot IS NULL
    OR reservation_capacity_per_slot >= 1
  ),
  ADD CONSTRAINT restaurant_profiles_cancel_cutoff_check CHECK (
    reservation_cancellation_cutoff_minutes IS NULL
    OR reservation_cancellation_cutoff_minutes >= 0
  );

-- Permite varios turnos de apertura durante el mismo día.
CREATE TABLE public.restaurant_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL
    REFERENCES public.restaurant_profiles(service_id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  opens_at time without time zone NOT NULL,
  closes_at time without time zone NOT NULL,
  position smallint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT restaurant_hours_nonzero_interval_check CHECK (
    opens_at <> closes_at
  ),
  CONSTRAINT restaurant_hours_position_key UNIQUE (
    service_id, day_of_week, position
  )
);

CREATE INDEX restaurant_hours_service_day_idx
  ON public.restaurant_hours(service_id, day_of_week, opens_at);

-- Guarda una sola ruta de imagen por plato o bebida del menú.
ALTER TABLE public.menu_dishes
  ADD COLUMN photo_storage_path text,
  ADD CONSTRAINT menu_dishes_photo_path_check CHECK (
    photo_storage_path IS NULL OR btrim(photo_storage_path) <> ''
  );

COMMENT ON COLUMN public.menu_dishes.photo_storage_path IS
  'Ruta de una foto única del plato o bebida dentro de Supabase Storage.';

-- Restringe las galerías a los máximos definidos por tipo de registro.
CREATE FUNCTION public.enforce_service_photo_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hospedaje_type_id text;
  v_is_restaurant boolean;
  v_area_service_id uuid;
  v_photo_limit integer;
  v_photo_count integer;
BEGIN
  -- Bloquea el servicio para que dos cargas simultáneas no excedan el límite.
  SELECT services.hospedaje_type_id
  INTO v_hospedaje_type_id
  FROM public.services AS services
  WHERE services.id = NEW.service_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El servicio asociado a la foto no existe.';
  END IF;

  IF NEW.lodging_area_id IS NOT NULL THEN
    SELECT lodging_areas.service_id
    INTO v_area_service_id
    FROM public.lodging_areas AS lodging_areas
    WHERE lodging_areas.id = NEW.lodging_area_id
    FOR UPDATE;

    IF v_area_service_id IS DISTINCT FROM NEW.service_id THEN
      RAISE EXCEPTION 'El área debe pertenecer al mismo hospedaje de la foto.';
    END IF;

    IF v_hospedaje_type_id IS NULL THEN
      RAISE EXCEPTION 'Las galerías por área solo aplican a hospedajes.';
    END IF;

    v_photo_limit := 10;
    SELECT count(*)::integer
    INTO v_photo_count
    FROM public.service_photos AS photos
    WHERE photos.lodging_area_id = NEW.lodging_area_id
      AND (TG_OP <> 'UPDATE' OR photos.id <> NEW.id);
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.restaurant_profiles AS profiles
      WHERE profiles.service_id = NEW.service_id
    )
    INTO v_is_restaurant;

    IF v_hospedaje_type_id IS NOT NULL THEN
      v_photo_limit := 15;
    ELSIF v_is_restaurant THEN
      v_photo_limit := 10;
    ELSE
      RETURN NEW;
    END IF;

    SELECT count(*)::integer
    INTO v_photo_count
    FROM public.service_photos AS photos
    WHERE photos.service_id = NEW.service_id
      AND photos.lodging_area_id IS NULL
      AND (TG_OP <> 'UPDATE' OR photos.id <> NEW.id);
  END IF;

  IF v_photo_count >= v_photo_limit THEN
    RAISE EXCEPTION 'La galería ya alcanzó el máximo de % fotos.', v_photo_limit;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER service_photos_enforce_limits
BEFORE INSERT OR UPDATE OF service_id, lodging_area_id ON public.service_photos
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_photo_limits();

-- Limita a diez fotos cada tipo de habitación o unidad reservable.
CREATE FUNCTION public.enforce_room_type_photo_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_photo_count integer;
BEGIN
  PERFORM 1
  FROM public.room_types AS room_types
  WHERE room_types.id = NEW.room_type_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El tipo de habitación asociado a la foto no existe.';
  END IF;

  SELECT count(*)::integer
  INTO v_photo_count
  FROM public.room_type_photos AS photos
  WHERE photos.room_type_id = NEW.room_type_id
    AND (TG_OP <> 'UPDATE' OR photos.id <> NEW.id);

  IF v_photo_count >= 10 THEN
    RAISE EXCEPTION 'Cada habitación o unidad admite un máximo de 10 fotos.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER room_type_photos_enforce_limit
BEFORE INSERT OR UPDATE OF room_type_id ON public.room_type_photos
FOR EACH ROW EXECUTE FUNCTION public.enforce_room_type_photo_limit();

-- Protege las tablas nuevas mientras se definen las políticas del padmin.
ALTER TABLE public.lodging_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lodging_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_hours ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lodging_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.lodging_areas FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.restaurant_hours FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.enforce_service_photo_limits()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_room_type_photo_limit()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_lodging_area_service()
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_lodging_updated_at()
FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';

-- Conserva campos específicos de cada hospedaje sin forzar una tabla por tipo.
ALTER TABLE public.lodging_profiles
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.room_types
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.lodging_areas
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Completa los datos operativos que pide la ficha del restaurante.
ALTER TABLE public.restaurant_profiles
  ADD COLUMN IF NOT EXISTS cuisine_type text,
  ADD COLUMN IF NOT EXISTS service_style text,
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS average_price_min_cents bigint,
  ADD COLUMN IF NOT EXISTS average_price_max_cents bigint,
  ADD COLUMN IF NOT EXISTS ambience text,
  ADD COLUMN IF NOT EXISTS accessibility_details text,
  ADD COLUMN IF NOT EXISTS cancellation_policy text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'restaurant_profiles_average_price_check'
      AND conrelid = 'public.restaurant_profiles'::regclass
  ) THEN
    ALTER TABLE public.restaurant_profiles
      ADD CONSTRAINT restaurant_profiles_average_price_check CHECK (
        (average_price_min_cents IS NULL OR average_price_min_cents >= 0)
        AND (average_price_max_cents IS NULL OR average_price_max_cents >= 0)
        AND (
          average_price_min_cents IS NULL
          OR average_price_max_cents IS NULL
          OR average_price_min_cents <= average_price_max_cents
        )
      );
  END IF;
END;
$$;

-- Mantiene disponibilidad, ingredientes, alérgenos y preferencias del menú.
ALTER TABLE public.menu_dishes
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ingredients text,
  ADD COLUMN IF NOT EXISTS allergens text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS dietary_tags text[] NOT NULL DEFAULT '{}';

-- Registra los envíos de propietarios sin hacer público el servicio antes de aprobarlo.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS review_comment text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'services_review_status_check'
      AND conrelid = 'public.services'::regclass
  ) THEN
    ALTER TABLE public.services
      ADD CONSTRAINT services_review_status_check CHECK (
        review_status IN ('not_submitted', 'pending', 'approved', 'rejected')
      );
  END IF;
END;
$$;

-- Guarda tarifas por temporada sin sobrescribir el precio base de cada unidad.
CREATE TABLE IF NOT EXISTS public.lodging_rate_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id uuid NOT NULL
    REFERENCES public.room_types(id) ON DELETE CASCADE,
  valid_from date NOT NULL,
  valid_to date NOT NULL,
  price_cents bigint NOT NULL CHECK (price_cents > 0),
  minimum_nights smallint CHECK (minimum_nights IS NULL OR minimum_nights >= 1),
  included_guests smallint CHECK (included_guests IS NULL OR included_guests >= 1),
  extra_guest_price_cents bigint CHECK (
    extra_guest_price_cents IS NULL OR extra_guest_price_cents >= 0
  ),
  cleaning_fee_cents bigint CHECK (
    cleaning_fee_cents IS NULL OR cleaning_fee_cents >= 0
  ),
  taxes_details text,
  deposit_cents bigint CHECK (deposit_cents IS NULL OR deposit_cents >= 0),
  cancellation_policy text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lodging_rate_periods_dates_check CHECK (valid_from <= valid_to)
);

CREATE INDEX IF NOT EXISTS lodging_rate_periods_room_dates_idx
  ON public.lodging_rate_periods(room_type_id, valid_from, valid_to);

-- Centraliza las comprobaciones de administrador y membresía sin recursión RLS.
CREATE OR REPLACE FUNCTION public.padmin_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins AS admins
    WHERE admins.user_id = (SELECT auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.padmin_owns_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_members AS members
    WHERE members.business_id = p_business_id
      AND members.user_id = (SELECT auth.uid())
      AND members.role IN ('owner', 'staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.padmin_can_manage_service(p_service_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.padmin_is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.services AS services
      JOIN public.business_members AS members
        ON members.business_id = services.business_id
      WHERE services.id = p_service_id
        AND members.user_id = (SELECT auth.uid())
        AND members.role IN ('owner', 'staff')
    );
$$;

CREATE OR REPLACE FUNCTION public.padmin_can_manage_room(p_room_type_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_types AS rooms
    WHERE rooms.id = p_room_type_id
      AND public.padmin_can_manage_service(rooms.service_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.padmin_can_manage_menu_section(p_section_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.menu_sections AS sections
    JOIN public.restaurant_profiles AS profiles
      ON profiles.service_id = sections.service_id
    WHERE sections.id = p_section_id
      AND public.padmin_can_manage_service(profiles.service_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.padmin_can_manage_menu_dish(p_dish_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.menu_dishes AS dishes
    JOIN public.menu_sections AS sections ON sections.id = dishes.section_id
    JOIN public.restaurant_profiles AS profiles
      ON profiles.service_id = sections.service_id
    WHERE dishes.id = p_dish_id
      AND public.padmin_can_manage_service(profiles.service_id)
  );
$$;

REVOKE ALL ON FUNCTION public.padmin_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_owns_business(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_can_manage_service(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_can_manage_room(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_can_manage_menu_section(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_can_manage_menu_dish(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_can_manage_service(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_can_manage_room(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_can_manage_menu_section(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_can_manage_menu_dish(uuid) TO authenticated;

-- Permite que el panel compruebe roles y negocios de la sesión actual.
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.platform_admins, public.business_members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.business_members TO authenticated;
DROP POLICY IF EXISTS padmin_identity_read ON public.platform_admins;
CREATE POLICY padmin_identity_read ON public.platform_admins
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_membership_read ON public.business_members;
CREATE POLICY padmin_membership_read ON public.business_members
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_membership_admin_manage ON public.business_members;
CREATE POLICY padmin_membership_admin_manage ON public.business_members
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_membership_write_fence ON public.business_members;
CREATE POLICY padmin_membership_write_fence ON public.business_members
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_membership_update_fence ON public.business_members;
CREATE POLICY padmin_membership_update_fence ON public.business_members
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_membership_delete_fence ON public.business_members;
CREATE POLICY padmin_membership_delete_fence ON public.business_members
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.padmin_is_admin());

DROP POLICY IF EXISTS padmin_identity_admin_manage ON public.platform_admins;
CREATE POLICY padmin_identity_admin_manage ON public.platform_admins
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_identity_write_fence ON public.platform_admins;
CREATE POLICY padmin_identity_write_fence ON public.platform_admins
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_identity_update_fence ON public.platform_admins;
CREATE POLICY padmin_identity_update_fence ON public.platform_admins
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_identity_delete_fence ON public.platform_admins;
CREATE POLICY padmin_identity_delete_fence ON public.platform_admins
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.padmin_is_admin());

-- Define las tablas administrables y la expresión que verifica su servicio padre.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('lodging_profiles', 'public.padmin_can_manage_service(service_id)'),
      ('lodging_areas', 'public.padmin_can_manage_service(service_id)'),
      ('lodging_rate_periods', 'public.padmin_can_manage_room(room_type_id)'),
      ('service_photos', 'public.padmin_can_manage_service(service_id)'),
      ('service_amenities', 'public.padmin_can_manage_service(service_id)'),
      ('restaurant_profiles', 'public.padmin_can_manage_service(service_id)'),
      ('restaurant_hours', 'public.padmin_can_manage_service(service_id)'),
      ('restaurant_service_features', 'public.padmin_can_manage_service(service_id)'),
      ('room_types', 'public.padmin_can_manage_service(service_id)'),
      ('room_type_photos', 'public.padmin_can_manage_room(room_type_id)'),
      ('room_type_amenities', 'public.padmin_can_manage_room(room_type_id)'),
      ('menu_sections', 'public.padmin_can_manage_service(service_id)'),
      ('menu_dishes', 'public.padmin_can_manage_menu_section(section_id)'),
      ('service_tourist_sites', 'public.padmin_can_manage_service(service_id)')
    ) AS tables(table_name, scope_expression)
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      item.table_name
    );
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
      item.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_member_access ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_member_access ON public.%I '
      'FOR ALL TO authenticated USING (%s) WITH CHECK (%s)',
      item.table_name,
      item.scope_expression,
      item.scope_expression
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_member_write_fence ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_member_write_fence ON public.%I '
      'AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)',
      item.table_name,
      item.scope_expression
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_member_update_fence ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_member_update_fence ON public.%I '
      'AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
      item.table_name,
      item.scope_expression,
      item.scope_expression
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_member_delete_fence ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_member_delete_fence ON public.%I '
      'AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)',
      item.table_name,
      item.scope_expression
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_anon_insert_fence ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_anon_insert_fence ON public.%I '
      'AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false)',
      item.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_anon_update_fence ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_anon_update_fence ON public.%I '
      'AS RESTRICTIVE FOR UPDATE TO anon USING (false) WITH CHECK (false)',
      item.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_anon_delete_fence ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_anon_delete_fence ON public.%I '
      'AS RESTRICTIVE FOR DELETE TO anon USING (false)',
      item.table_name
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_service_tourist_sites(uuid, uuid[])
TO authenticated;

-- Expone únicamente los datos relacionados con servicios ya publicados.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('lodging_profiles',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('lodging_areas',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('restaurant_profiles',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('restaurant_hours',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('room_types',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('lodging_rate_periods',
        'EXISTS (SELECT 1 FROM public.room_types r '
        'JOIN public.services s ON s.id = r.service_id '
        'WHERE r.id = room_type_id AND s.status = ''published'')'),
      ('service_photos',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('service_amenities',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('room_type_photos',
        'EXISTS (SELECT 1 FROM public.room_types r '
        'JOIN public.services s ON s.id = r.service_id '
        'WHERE r.id = room_type_id AND s.status = ''published'')'),
      ('menu_sections',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')'),
      ('menu_dishes',
        'EXISTS (SELECT 1 FROM public.menu_sections section '
        'JOIN public.services s ON s.id = section.service_id '
        'WHERE section.id = section_id AND s.status = ''published'')'),
      ('service_tourist_sites',
        'EXISTS (SELECT 1 FROM public.services s '
        'WHERE s.id = service_id AND s.status = ''published'')')
    ) AS public_tables(table_name, read_expression)
  LOOP
    EXECUTE format(
      'GRANT SELECT ON public.%I TO anon, authenticated',
      item.table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_published_read ON public.%I',
      item.table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_published_read ON public.%I '
      'FOR SELECT TO anon, authenticated USING (%s)',
      item.table_name,
      item.read_expression
    );
  END LOOP;
END;
$$;

-- Los nombres de comodidades son datos públicos del catálogo.
GRANT SELECT ON public.amenities TO anon, authenticated;
DROP POLICY IF EXISTS padmin_public_catalog_read ON public.amenities;
CREATE POLICY padmin_public_catalog_read ON public.amenities
FOR SELECT TO anon, authenticated USING (true);

-- Permite crear servicios dentro de un negocio propio y reserva la publicación al admin.
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
DROP POLICY IF EXISTS padmin_service_access ON public.services;
CREATE POLICY padmin_service_access ON public.services
FOR ALL TO authenticated
USING (public.padmin_can_manage_service(id))
WITH CHECK (
  public.padmin_is_admin()
  OR public.padmin_owns_business(business_id)
);
DROP POLICY IF EXISTS padmin_service_insert_fence ON public.services;
CREATE POLICY padmin_service_insert_fence ON public.services
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  public.padmin_is_admin()
  OR public.padmin_owns_business(business_id)
);
DROP POLICY IF EXISTS padmin_service_update_fence ON public.services;
CREATE POLICY padmin_service_update_fence ON public.services
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.padmin_can_manage_service(id))
WITH CHECK (
  public.padmin_is_admin()
  OR public.padmin_owns_business(business_id)
);
DROP POLICY IF EXISTS padmin_service_delete_fence ON public.services;
CREATE POLICY padmin_service_delete_fence ON public.services
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.padmin_can_manage_service(id));
DROP POLICY IF EXISTS padmin_service_anon_insert_fence ON public.services;
CREATE POLICY padmin_service_anon_insert_fence ON public.services
AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false);
DROP POLICY IF EXISTS padmin_service_anon_update_fence ON public.services;
CREATE POLICY padmin_service_anon_update_fence ON public.services
AS RESTRICTIVE FOR UPDATE TO anon USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS padmin_service_anon_delete_fence ON public.services;
CREATE POLICY padmin_service_anon_delete_fence ON public.services
AS RESTRICTIVE FOR DELETE TO anon USING (false);

CREATE OR REPLACE FUNCTION public.padmin_protect_service_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.padmin_is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.business_id IS DISTINCT FROM OLD.business_id THEN
      RAISE EXCEPTION 'Solo un administrador puede cambiar el negocio del servicio.';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'El propietario solo puede retirar un servicio como borrador.';
    END IF;

    IF NEW.is_recommended IS DISTINCT FROM OLD.is_recommended
      OR NEW.review_comment IS DISTINCT FROM OLD.review_comment THEN
      RAISE EXCEPTION 'Solo un administrador puede publicar o moderar servicios.';
    END IF;

    IF NEW.review_status IS DISTINCT FROM OLD.review_status
      AND NEW.review_status NOT IN ('pending', 'not_submitted') THEN
      RAISE EXCEPTION 'El propietario no puede aprobar ni rechazar sus cambios.';
    END IF;
  ELSIF NEW.status <> 'draft' OR NEW.is_recommended THEN
    RAISE EXCEPTION 'Los servicios nuevos empiezan como borrador.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS services_protect_review ON public.services;
CREATE TRIGGER services_protect_review
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW EXECUTE FUNCTION public.padmin_protect_service_review();

REVOKE ALL ON FUNCTION public.padmin_protect_service_review() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_protect_service_review() TO authenticated;

-- Los catálogos se pueden consultar desde formularios autenticados.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'businesses', 'categories', 'cities', 'provinces', 'tourist_sites',
    'amenities', 'hospedaje_types', 'meal_plans', 'restaurant_feature_catalog'
  ]
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', table_name);
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_authenticated_read ON public.%I', table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_authenticated_read ON public.%I '
      'FOR SELECT TO authenticated USING (true)', table_name
    );
  END LOOP;
END;
$$;

-- Solo los administradores pueden cambiar catálogos o asignaciones de negocio.
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
GRANT INSERT, UPDATE, DELETE ON public.businesses TO authenticated;
DROP POLICY IF EXISTS padmin_admin_businesses ON public.businesses;
CREATE POLICY padmin_admin_businesses ON public.businesses
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_business_write_fence ON public.businesses;
CREATE POLICY padmin_business_write_fence ON public.businesses
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_business_update_fence ON public.businesses;
CREATE POLICY padmin_business_update_fence ON public.businesses
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_business_delete_fence ON public.businesses;
CREATE POLICY padmin_business_delete_fence ON public.businesses
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.padmin_is_admin());

ALTER TABLE public.tourist_sites ENABLE ROW LEVEL SECURITY;
GRANT INSERT, UPDATE, DELETE ON public.tourist_sites TO authenticated;
DROP POLICY IF EXISTS padmin_admin_sites ON public.tourist_sites;
CREATE POLICY padmin_admin_sites ON public.tourist_sites
FOR ALL TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_site_write_fence ON public.tourist_sites;
CREATE POLICY padmin_site_write_fence ON public.tourist_sites
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_site_update_fence ON public.tourist_sites;
CREATE POLICY padmin_site_update_fence ON public.tourist_sites
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.padmin_is_admin())
WITH CHECK (public.padmin_is_admin());
DROP POLICY IF EXISTS padmin_site_delete_fence ON public.tourist_sites;
CREATE POLICY padmin_site_delete_fence ON public.tourist_sites
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.padmin_is_admin());

-- Impide que políticas previas permitan escrituras anónimas en tablas del panel.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'businesses', 'business_members', 'platform_admins', 'tourist_sites'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_anon_insert_fence ON public.%I', table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_anon_insert_fence ON public.%I '
      'AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false)', table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_anon_update_fence ON public.%I', table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_anon_update_fence ON public.%I '
      'AS RESTRICTIVE FOR UPDATE TO anon USING (false) WITH CHECK (false)',
      table_name
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS padmin_anon_delete_fence ON public.%I', table_name
    );
    EXECUTE format(
      'CREATE POLICY padmin_anon_delete_fence ON public.%I '
      'AS RESTRICTIVE FOR DELETE TO anon USING (false)', table_name
    );
  END LOOP;
END;
$$;

-- Prepara un bucket público de imágenes con escritura limitada al negocio dueño.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-media',
  'service-media',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.padmin_can_manage_media_path(p_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_service_id text;
BEGIN
  v_service_id := (storage.foldername(p_name))[1];
  IF v_service_id IS NULL OR v_service_id !~* '^[0-9a-f-]{36}$' THEN
    RETURN false;
  END IF;
  RETURN public.padmin_can_manage_service(v_service_id::uuid);
END;
$$;

REVOKE ALL ON FUNCTION public.padmin_can_manage_media_path(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_can_manage_media_path(text) TO authenticated;

DROP POLICY IF EXISTS padmin_service_media_public_read ON storage.objects;
CREATE POLICY padmin_service_media_public_read ON storage.objects
FOR SELECT TO public USING (bucket_id = 'service-media');

DROP POLICY IF EXISTS padmin_service_media_insert ON storage.objects;
CREATE POLICY padmin_service_media_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'service-media'
  AND public.padmin_can_manage_media_path(name)
);

DROP POLICY IF EXISTS padmin_service_media_update ON storage.objects;
CREATE POLICY padmin_service_media_update ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'service-media'
  AND public.padmin_can_manage_media_path(name)
)
WITH CHECK (
  bucket_id = 'service-media'
  AND public.padmin_can_manage_media_path(name)
);

DROP POLICY IF EXISTS padmin_service_media_delete ON storage.objects;
CREATE POLICY padmin_service_media_delete ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'service-media'
  AND public.padmin_can_manage_media_path(name)
);

-- Limita cualquier política previa de Storage para las imágenes de servicios.
DROP POLICY IF EXISTS padmin_service_media_write_fence ON storage.objects;
CREATE POLICY padmin_service_media_write_fence ON storage.objects
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (
  bucket_id <> 'service-media'
  OR public.padmin_can_manage_media_path(name)
);
DROP POLICY IF EXISTS padmin_service_media_update_fence ON storage.objects;
CREATE POLICY padmin_service_media_update_fence ON storage.objects
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (
  bucket_id <> 'service-media'
  OR public.padmin_can_manage_media_path(name)
)
WITH CHECK (
  bucket_id <> 'service-media'
  OR public.padmin_can_manage_media_path(name)
);
DROP POLICY IF EXISTS padmin_service_media_delete_fence ON storage.objects;
CREATE POLICY padmin_service_media_delete_fence ON storage.objects
AS RESTRICTIVE FOR DELETE TO authenticated
USING (
  bucket_id <> 'service-media'
  OR public.padmin_can_manage_media_path(name)
);
DROP POLICY IF EXISTS padmin_anon_service_media_insert_fence ON storage.objects;
CREATE POLICY padmin_anon_service_media_insert_fence ON storage.objects
AS RESTRICTIVE FOR INSERT TO anon
WITH CHECK (bucket_id <> 'service-media');
DROP POLICY IF EXISTS padmin_anon_service_media_update_fence ON storage.objects;
CREATE POLICY padmin_anon_service_media_update_fence ON storage.objects
AS RESTRICTIVE FOR UPDATE TO anon
USING (bucket_id <> 'service-media')
WITH CHECK (bucket_id <> 'service-media');
DROP POLICY IF EXISTS padmin_anon_service_media_delete_fence ON storage.objects;
CREATE POLICY padmin_anon_service_media_delete_fence ON storage.objects
AS RESTRICTIVE FOR DELETE TO anon
USING (bucket_id <> 'service-media');

NOTIFY pgrst, 'reload schema';

-- Guarda el enlace externo del menú publicado por cada restaurante.
ALTER TABLE public.restaurant_profiles
  ADD COLUMN IF NOT EXISTS menu_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'restaurant_profiles_menu_url_check'
      AND conrelid = 'public.restaurant_profiles'::regclass
  ) THEN
    ALTER TABLE public.restaurant_profiles
      ADD CONSTRAINT restaurant_profiles_menu_url_check CHECK (
        menu_url IS NULL
        OR (
          btrim(menu_url) <> ''
          AND menu_url ~* '^https?://'
        )
      );
  END IF;
END;
$$;

-- El menú se conserva como texto y precios, sin imágenes individuales.
ALTER TABLE public.menu_dishes
  DROP COLUMN IF EXISTS photo_storage_path;

-- Conserva galerías de hospedaje y amplía solo la galería del restaurante.
CREATE OR REPLACE FUNCTION public.enforce_service_photo_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hospedaje_type_id text;
  v_is_restaurant boolean;
  v_area_service_id uuid;
  v_photo_limit integer;
  v_photo_count integer;
BEGIN
  -- Bloquea el servicio para impedir cargas simultáneas sobre el límite.
  SELECT services.hospedaje_type_id
  INTO v_hospedaje_type_id
  FROM public.services AS services
  WHERE services.id = NEW.service_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El servicio asociado a la foto no existe.';
  END IF;

  IF NEW.lodging_area_id IS NOT NULL THEN
    SELECT lodging_areas.service_id
    INTO v_area_service_id
    FROM public.lodging_areas AS lodging_areas
    WHERE lodging_areas.id = NEW.lodging_area_id
    FOR UPDATE;

    IF v_area_service_id IS DISTINCT FROM NEW.service_id THEN
      RAISE EXCEPTION 'El área debe pertenecer al mismo hospedaje de la foto.';
    END IF;

    IF v_hospedaje_type_id IS NULL THEN
      RAISE EXCEPTION 'Las galerías por área solo aplican a hospedajes.';
    END IF;

    v_photo_limit := 10;
    SELECT count(*)::integer
    INTO v_photo_count
    FROM public.service_photos AS photos
    WHERE photos.lodging_area_id = NEW.lodging_area_id
      AND (TG_OP <> 'UPDATE' OR photos.id <> NEW.id);
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM public.restaurant_profiles AS profiles
      WHERE profiles.service_id = NEW.service_id
    )
    INTO v_is_restaurant;

    IF v_hospedaje_type_id IS NOT NULL THEN
      v_photo_limit := 15;
    ELSIF v_is_restaurant THEN
      v_photo_limit := 30;
    ELSE
      RETURN NEW;
    END IF;

    SELECT count(*)::integer
    INTO v_photo_count
    FROM public.service_photos AS photos
    WHERE photos.service_id = NEW.service_id
      AND photos.lodging_area_id IS NULL
      AND (TG_OP <> 'UPDATE' OR photos.id <> NEW.id);
  END IF;

  IF v_photo_count >= v_photo_limit THEN
    RAISE EXCEPTION 'La galería ya alcanzó el máximo de % fotos.', v_photo_limit;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_photos_enforce_limits ON public.service_photos;
CREATE TRIGGER service_photos_enforce_limits
BEFORE INSERT OR UPDATE OF service_id, lodging_area_id ON public.service_photos
FOR EACH ROW EXECUTE FUNCTION public.enforce_service_photo_limits();

COMMENT ON COLUMN public.restaurant_profiles.menu_url IS
  'Enlace HTTP o HTTPS al menú externo publicado por el restaurante.';

NOTIFY pgrst, 'reload schema';

-- Distingue al propietario principal, los admins y colaboradores internos.
ALTER TABLE public.platform_admins
  ADD COLUMN IF NOT EXISTS platform_role text NOT NULL DEFAULT 'admin';

ALTER TABLE public.platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_platform_role_check;
ALTER TABLE public.platform_admins
  ADD CONSTRAINT platform_admins_platform_role_check
  CHECK (platform_role IN ('owner', 'admin', 'collaborator'));

-- Impide crear más de una cuenta de propietario principal.
CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_single_owner_idx
  ON public.platform_admins ((platform_role))
  WHERE platform_role = 'owner';

-- Devuelve el rol interno de la sesión sin activar recursión de RLS.
CREATE OR REPLACE FUNCTION public.padmin_current_platform_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT admins.platform_role
  FROM public.platform_admins AS admins
  WHERE admins.user_id = (SELECT auth.uid())
  LIMIT 1;
$$;

-- El equipo con control de catálogo se limita al propietario y los admins.
CREATE OR REPLACE FUNCTION public.padmin_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    public.padmin_current_platform_role() IN ('owner', 'admin'),
    false
  );
$$;

-- Los tres roles internos pueden administrar accesos de negocios proveedores.
CREATE OR REPLACE FUNCTION public.padmin_can_manage_providers()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.padmin_current_platform_role()
    IN ('owner', 'admin', 'collaborator');
$$;

REVOKE ALL ON FUNCTION public.padmin_current_platform_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.padmin_can_manage_providers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.padmin_current_platform_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.padmin_can_manage_providers() TO authenticated;

-- La cuenta principal no se puede modificar ni eliminar desde la aplicación.
DROP POLICY IF EXISTS padmin_identity_admin_manage ON public.platform_admins;
DROP POLICY IF EXISTS padmin_identity_write_fence ON public.platform_admins;
DROP POLICY IF EXISTS padmin_identity_update_fence ON public.platform_admins;
DROP POLICY IF EXISTS padmin_identity_delete_fence ON public.platform_admins;

CREATE POLICY padmin_identity_insert_roles ON public.platform_admins
FOR INSERT TO authenticated
WITH CHECK (
  platform_role IN ('admin', 'collaborator')
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
);

CREATE POLICY padmin_identity_update_roles ON public.platform_admins
FOR UPDATE TO authenticated
USING (
  platform_role <> 'owner'
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
)
WITH CHECK (
  platform_role IN ('admin', 'collaborator')
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
);

CREATE POLICY padmin_identity_delete_roles ON public.platform_admins
FOR DELETE TO authenticated
USING (
  platform_role <> 'owner'
  AND (
    public.padmin_current_platform_role() = 'owner'
    OR (
      public.padmin_current_platform_role() = 'admin'
      AND platform_role = 'collaborator'
    )
  )
);

-- Colaboradores pueden trabajar con membresías de negocios, no con el catálogo.
DROP POLICY IF EXISTS padmin_membership_admin_manage ON public.business_members;
DROP POLICY IF EXISTS padmin_membership_write_fence ON public.business_members;
DROP POLICY IF EXISTS padmin_membership_update_fence ON public.business_members;
DROP POLICY IF EXISTS padmin_membership_delete_fence ON public.business_members;

CREATE POLICY padmin_membership_manage_roles ON public.business_members
FOR ALL TO authenticated
USING (public.padmin_can_manage_providers())
WITH CHECK (public.padmin_can_manage_providers());

CREATE POLICY padmin_membership_insert_fence ON public.business_members
AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (public.padmin_can_manage_providers());
CREATE POLICY padmin_membership_update_fence ON public.business_members
AS RESTRICTIVE FOR UPDATE TO authenticated
USING (public.padmin_can_manage_providers())
WITH CHECK (public.padmin_can_manage_providers());
CREATE POLICY padmin_membership_delete_fence ON public.business_members
AS RESTRICTIVE FOR DELETE TO authenticated
USING (public.padmin_can_manage_providers());

NOTIFY pgrst, 'reload schema';

COMMIT;