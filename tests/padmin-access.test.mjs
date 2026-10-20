import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "../.validation/node_modules/@electric-sql/pglite/dist/index.js";

const businessId = "20000000-0000-0000-0000-000000000001";
const serviceId = "20000000-0000-0000-0000-000000000002";
const memberId = "20000000-0000-0000-0000-000000000003";
const adminId = "20000000-0000-0000-0000-000000000004";

test("Permisos de padmin y lectura pública de servicios publicados", async () => {
  const db = new PGlite();

  try {
    // Crea las dependencias mínimas de Supabase utilizadas por la migración.
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE SCHEMA storage;
      CREATE FUNCTION auth.uid() RETURNS uuid
        LANGUAGE sql STABLE AS $$
          SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
        $$;
      CREATE FUNCTION storage.foldername(text) RETURNS text[]
        LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array($1, '/') $$;
      CREATE TABLE storage.buckets (
        id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL,
        file_size_limit bigint, allowed_mime_types text[]
      );
      CREATE TABLE storage.objects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        bucket_id text NOT NULL, name text NOT NULL
      );
      CREATE TABLE public.businesses (id uuid PRIMARY KEY, name text NOT NULL);
      CREATE TABLE public.platform_admins (user_id uuid PRIMARY KEY);
      CREATE TABLE public.business_members (
        business_id uuid NOT NULL, user_id uuid NOT NULL, role text NOT NULL,
        PRIMARY KEY (business_id, user_id)
      );
      CREATE TABLE public.categories (id text PRIMARY KEY, label text, sort_order smallint);
      CREATE TABLE public.cities (id text PRIMARY KEY, name text);
      CREATE TABLE public.provinces (id text PRIMARY KEY);
      CREATE TABLE public.tourist_sites (id uuid PRIMARY KEY);
      CREATE TABLE public.amenities (id text PRIMARY KEY, label text);
      CREATE TABLE public.hospedaje_types (id text PRIMARY KEY, label text);
      CREATE TABLE public.meal_plans (id text PRIMARY KEY);
      CREATE TABLE public.restaurant_feature_catalog (id text PRIMARY KEY, label text);
      CREATE TABLE public.services (
        id uuid PRIMARY KEY, business_id uuid NOT NULL,
        description text,
        hospedaje_type_id text, status text NOT NULL DEFAULT 'draft',
        is_recommended boolean NOT NULL DEFAULT false
      );
      ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
      CREATE POLICY existing_public_service_read ON public.services
        FOR SELECT TO anon, authenticated USING (status = 'published');
      CREATE TABLE public.lodging_profiles (service_id uuid PRIMARY KEY);
      CREATE TABLE public.lodging_areas (
        id uuid PRIMARY KEY, service_id uuid NOT NULL, name text NOT NULL
      );
      CREATE TABLE public.room_types (
        id uuid PRIMARY KEY, service_id uuid NOT NULL
      );
      CREATE TABLE public.service_photos (
        id uuid PRIMARY KEY, service_id uuid NOT NULL, lodging_area_id uuid
      );
      CREATE TABLE public.service_amenities (
        service_id uuid NOT NULL, amenity_id text NOT NULL
      );
      CREATE TABLE public.restaurant_profiles (
        service_id uuid PRIMARY KEY, tag text NOT NULL,
        payment_methods text[] NOT NULL DEFAULT '{}',
        hours_from time NOT NULL, hours_to time NOT NULL
      );
      CREATE TABLE public.restaurant_hours (service_id uuid NOT NULL);
      CREATE TABLE public.restaurant_service_features (service_id uuid NOT NULL);
      CREATE TABLE public.room_type_photos (
        room_type_id uuid NOT NULL
      );
      CREATE TABLE public.room_type_amenities (room_type_id uuid NOT NULL);
      CREATE TABLE public.menu_sections (
        id uuid PRIMARY KEY, service_id uuid NOT NULL
      );
      CREATE TABLE public.menu_dishes (
        id uuid PRIMARY KEY, section_id uuid NOT NULL
      );
      CREATE TABLE public.service_tourist_sites (
        service_id uuid NOT NULL, tourist_site_id uuid NOT NULL
      );
      CREATE FUNCTION public.set_service_tourist_sites(uuid, uuid[])
        RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$;
      INSERT INTO public.services (id, business_id, hospedaje_type_id, status)
      VALUES ('${serviceId}', '${businessId}', 'hotel', 'published');
      INSERT INTO public.business_members (business_id, user_id, role)
      VALUES ('${businessId}', '${memberId}', 'owner');
      INSERT INTO public.platform_admins (user_id) VALUES ('${adminId}');
      GRANT SELECT ON public.services TO anon, authenticated;
    `);

    const migration = await readFile(
      new URL(
        "../supabase/migrations/202610150002_padmin_access_and_catalog_details.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);

    // Confirma que las políticas distingan miembros de otros usuarios.
    await db.query(
      "SELECT set_config('request.jwt.claim.sub', $1, false)",
      [memberId],
    );
    const membershipAccess = await db.query(
      "SELECT public.padmin_can_manage_service($1) AS allowed",
      [serviceId],
    );
    assert.equal(membershipAccess.rows[0].allowed, true);

    await db.query(
      "SELECT set_config('request.jwt.claim.sub', $1, false)",
      ["20000000-0000-0000-0000-000000000099"],
    );
    const outsiderAccess = await db.query(
      "SELECT public.padmin_can_manage_service($1) AS allowed",
      [serviceId],
    );
    assert.equal(outsiderAccess.rows[0].allowed, false);

    // Comprueba columnas y políticas públicas de las fichas publicadas.
    const restaurantColumns = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'restaurant_profiles'
        AND column_name = 'average_price_min_cents'
    `);
    assert.equal(restaurantColumns.rows.length, 1);

    const publicPolicy = await db.query(`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'lodging_profiles'
        AND policyname = 'padmin_published_read'
    `);
    assert.equal(publicPolicy.rows.length, 1);

    await db.query(
      "INSERT INTO public.lodging_profiles (service_id) VALUES ($1)",
      [serviceId],
    );
    await db.exec("SET ROLE anon");
    const publishedProfile = await db.query(
      "SELECT service_id FROM public.lodging_profiles",
    );
    assert.equal(publishedProfile.rows.length, 1);
    await db.exec("RESET ROLE");

    // Un miembro actualiza el contenido publicado sin retirar la ficha del catálogo.
    await db.query("UPDATE public.services SET status = 'published' WHERE id = $1", [serviceId]);
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [memberId]);
    await db.exec("SET ROLE authenticated");
    await db.query(
      "UPDATE public.services SET description = 'Nueva ubicación e información' WHERE id = $1",
      [serviceId],
    );
    await db.exec("RESET ROLE");
    const stillPublished = await db.query(
      "SELECT status, description FROM public.services WHERE id = $1", [serviceId],
    );
    assert.equal(stillPublished.rows[0].status, "published");
    assert.equal(stillPublished.rows[0].description, "Nueva ubicación e información");

    // Un comercio solo edita servicios que el equipo ya le asignó.
    const assignedServicesMigration = await readFile(
      new URL("../supabase/migrations/202610200003_provider_assigned_services.sql", import.meta.url),
      "utf8",
    );
    await db.exec(assignedServicesMigration);
    await db.exec("SET ROLE authenticated");
    await assert.rejects(
      db.query("INSERT INTO public.services (id, business_id) VALUES ($1, $2)", [
        "20000000-0000-0000-0000-000000000005", businessId,
      ]),
      /row-level security policy/,
    );
    await db.exec("RESET ROLE");

    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [adminId]);
    await db.exec("SET ROLE authenticated");
    await db.query("INSERT INTO public.services (id, business_id) VALUES ($1, $2)", [
      "20000000-0000-0000-0000-000000000006", businessId,
    ]);
    await db.exec("RESET ROLE");

    // Un dueño retira la ficha a borrador mientras espera revisión.
    await db.query(
      "SELECT set_config('request.jwt.claim.sub', $1, false)",
      [memberId],
    );
    await db.exec("SET ROLE authenticated");
    await db.query(
      `UPDATE public.services
       SET status = 'draft', review_status = 'pending'
       WHERE id = $1`,
      [serviceId],
    );
    await assert.rejects(
      db.query(
        "UPDATE public.services SET status = 'published' WHERE id = $1",
        [serviceId],
      ),
      /El propietario solo puede retirar un servicio como borrador/,
    );
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});
