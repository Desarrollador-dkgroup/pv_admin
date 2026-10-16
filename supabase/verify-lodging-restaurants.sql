-- Comprueba los objetos base creados por la migración de galerías.
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'lodging_profiles', 'lodging_areas', 'restaurant_hours',
    'service_tourist_sites'
  )
ORDER BY table_name;

-- Comprueba campos necesarios para administrar fichas y galerías.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'services' AND column_name IN (
      'address', 'review_status', 'review_comment'
    ))
    OR (table_name = 'lodging_profiles' AND column_name = 'details')
    OR (table_name = 'lodging_areas' AND column_name = 'details')
    OR (table_name = 'room_types' AND column_name IN (
      'booking_unit', 'bedroom_count', 'bathroom_count', 'area_m2', 'details'
    ))
    OR (table_name = 'service_photos' AND column_name = 'lodging_area_id')
    OR (table_name = 'room_type_photos' AND column_name = 'is_cover')
    OR (table_name = 'menu_dishes' AND column_name IN (
      'is_available', 'ingredients', 'allergens', 'dietary_tags'
    ))
    OR (table_name = 'restaurant_profiles' AND column_name IN (
      'cuisine_type', 'service_style', 'details', 'contact_phone',
      'contact_email', 'website_url', 'ambience',
      'average_price_min_cents', 'average_price_max_cents',
      'accepts_reservations', 'reservation_policy', 'menu_url'
    ))
  )
ORDER BY table_name, column_name;

-- Revisa RLS y las políticas de edición y lectura pública.
SELECT tablename, policyname, cmd, roles, permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'lodging_profiles', 'lodging_areas', 'restaurant_hours',
    'room_types', 'room_type_photos', 'menu_sections', 'menu_dishes',
    'service_photos', 'service_amenities', 'service_tourist_sites',
    'services', 'business_members', 'platform_admins'
  )
ORDER BY tablename, policyname;

-- Detecta galerías generales que superan su máximo por servicio.
SELECT
  services.id AS service_id,
  services.name,
  CASE
    WHEN services.hospedaje_type_id IS NOT NULL THEN 15
    ELSE 30
  END AS photo_limit,
  count(photos.id) AS photo_count
FROM public.services AS services
LEFT JOIN public.service_photos AS photos
  ON photos.service_id = services.id
  AND photos.lodging_area_id IS NULL
WHERE services.hospedaje_type_id IS NOT NULL
   OR EXISTS (
     SELECT 1
     FROM public.restaurant_profiles AS profiles
     WHERE profiles.service_id = services.id
   )
GROUP BY services.id, services.name, services.hospedaje_type_id
HAVING count(photos.id) > CASE
  WHEN services.hospedaje_type_id IS NOT NULL THEN 15
  ELSE 30
END;

-- Detecta galerías de áreas y habitaciones que superan diez fotos.
SELECT lodging_area_id, count(*) AS photo_count
FROM public.service_photos
WHERE lodging_area_id IS NOT NULL
GROUP BY lodging_area_id
HAVING count(*) > 10;

SELECT room_type_id, count(*) AS photo_count
FROM public.room_type_photos
GROUP BY room_type_id
HAVING count(*) > 10;

-- Confirma que el menú contiene productos y enlaces externos configurados.
SELECT
  (SELECT count(*) FROM public.menu_dishes) AS menu_item_count,
  (SELECT count(*)
   FROM public.restaurant_profiles
   WHERE menu_url IS NOT NULL) AS restaurants_with_menu_link,
  NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'menu_dishes'
      AND column_name = 'photo_storage_path'
  ) AS dish_photo_column_removed;

-- Resume roles internos y confirma que exista como máximo un propietario.
SELECT platform_role, count(*) AS account_count
FROM public.platform_admins
GROUP BY platform_role
ORDER BY platform_role;

SELECT count(*) AS owner_account_count
FROM public.platform_admins
WHERE platform_role = 'owner';
