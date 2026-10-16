BEGIN;

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
COMMIT;
