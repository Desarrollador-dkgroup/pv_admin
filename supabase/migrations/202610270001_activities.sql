BEGIN;

-- Tabla de perfiles de actividades con detalles en JSONB.
CREATE TABLE public.activity_profiles (
  service_id uuid PRIMARY KEY
    REFERENCES public.services(id) ON DELETE CASCADE,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activity_profiles IS
  'Información operativa de actividades, tours y atracciones.';

COMMENT ON COLUMN public.activity_profiles.details IS
  'Contiene: schedule (horario semanal), minAge, whatIncludes, attractions.';

-- Crea perfiles vacíos para actividades ya registradas.
INSERT INTO public.activity_profiles (service_id)
SELECT id
FROM public.services
WHERE category_id = 'actividades'
ON CONFLICT (service_id) DO NOTHING;

-- Actualiza el límite de fotos: actividades tienen 15 fotos como hospedajes.
CREATE OR REPLACE FUNCTION public.enforce_service_photo_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_hospedaje_type_id text;
  v_category_id text;
  v_is_restaurant boolean;
  v_area_service_id uuid;
  v_photo_limit integer;
  v_photo_count integer;
BEGIN
  -- Bloquea el servicio para impedir cargas simultáneas.
  SELECT services.hospedaje_type_id, services.category_id
  INTO v_hospedaje_type_id, v_category_id
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
    ELSIF v_category_id = 'actividades' THEN
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

NOTIFY pgrst, 'reload schema';
COMMIT;
