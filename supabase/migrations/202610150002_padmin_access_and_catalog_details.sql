BEGIN;

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
COMMIT;
