BEGIN;

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
COMMIT;
