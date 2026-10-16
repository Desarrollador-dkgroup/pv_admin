import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "../.validation/node_modules/@electric-sql/pglite/dist/index.js";

const serviceId = "00000000-0000-0000-0000-000000000001";
const citySite = "00000000-0000-0000-0000-000000000002";
const oldTown = "00000000-0000-0000-0000-000000000003";
const businessId = "00000000-0000-0000-0000-000000000004";
const memberId = "00000000-0000-0000-0000-000000000005";
const adminId = "00000000-0000-0000-0000-000000000006";

// Ejecuta las migraciones en PostgreSQL local sin conectarse a Supabase.
test("Migraciones de promociones y múltiples sitios", async () => {
  const db = new PGlite();
  const check = async (name, callback) => {
    await callback();
    console.log(`Verificado: ${name}`);
  };
  try {
    // Reproduce los campos previos y roles necesarios del esquema proporcionado.
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
      CREATE TABLE public.amenities (id text PRIMARY KEY, label text);
      CREATE TABLE public.meal_plans (id text PRIMARY KEY);
      CREATE TABLE public.restaurant_feature_catalog (id text PRIMARY KEY, label text);
      CREATE TABLE public.tourist_sites (id uuid PRIMARY KEY);
      CREATE TABLE public.hospedaje_types (id text PRIMARY KEY);
      CREATE TABLE public.services (
        id uuid PRIMARY KEY,
        business_id uuid,
        tourist_site_id uuid REFERENCES public.tourist_sites(id),
        status text NOT NULL DEFAULT 'draft',
        is_recommended boolean NOT NULL DEFAULT false,
        hospedaje_type_id text REFERENCES public.hospedaje_types(id)
      );
      CREATE TABLE public.promotions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.room_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id uuid NOT NULL REFERENCES public.services(id)
      );
      CREATE TABLE public.service_photos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id uuid NOT NULL REFERENCES public.services(id),
        storage_path text NOT NULL,
        is_cover boolean NOT NULL DEFAULT false,
        alt_text text,
        position smallint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.room_type_photos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        room_type_id uuid NOT NULL REFERENCES public.room_types(id),
        storage_path text NOT NULL,
        position smallint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.restaurant_profiles (
        service_id uuid PRIMARY KEY REFERENCES public.services(id),
        tag text NOT NULL,
        payment_methods text[] NOT NULL DEFAULT '{}',
        hours_from time NOT NULL,
        hours_to time NOT NULL
      );
      CREATE TABLE public.menu_sections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id uuid NOT NULL
          REFERENCES public.restaurant_profiles(service_id),
        title text NOT NULL,
        position smallint NOT NULL DEFAULT 0
      );
      CREATE TABLE public.menu_dishes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        section_id uuid NOT NULL REFERENCES public.menu_sections(id),
        name text NOT NULL,
        description text NOT NULL,
        price_cents bigint NOT NULL CHECK (price_cents > 0),
        position smallint NOT NULL DEFAULT 0
      );
      CREATE TABLE public.service_amenities (
        service_id uuid NOT NULL, amenity_id text NOT NULL
      );
      CREATE TABLE public.restaurant_service_features (service_id uuid NOT NULL);
      CREATE TABLE public.room_type_amenities (room_type_id uuid NOT NULL);
      INSERT INTO public.promotions DEFAULT VALUES;
      INSERT INTO public.tourist_sites VALUES ('${citySite}'), ('${oldTown}');
      INSERT INTO public.services (id, tourist_site_id, status)
      VALUES ('${serviceId}', '${citySite}', 'published');
      UPDATE public.services SET business_id = '${businessId}' WHERE id = '${serviceId}';
      INSERT INTO public.business_members (business_id, user_id, role)
      VALUES ('${businessId}', '${memberId}', 'owner');
      INSERT INTO public.platform_admins (user_id) VALUES ('${adminId}');
      GRANT SELECT ON public.services, public.tourist_sites TO anon, authenticated;
      GRANT UPDATE ON public.services TO authenticated;
      ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
      CREATE POLICY public_services ON public.services FOR SELECT
        USING (status = 'published');
      CREATE POLICY existing_service_updates ON public.services FOR UPDATE
        TO authenticated USING (true) WITH CHECK (true);
    `);

    const sql = await readFile(
      new URL("../supabase/APLICAR_EN_SUPABASE.sql", import.meta.url),
      "utf8",
    );
    await db.exec(sql);

    await check("Conserva precios desconocidos y asociaciones anteriores", async () => {
      const price = await db.query("SELECT discount_percent FROM public.promotions");
      assert.equal(price.rows[0].discount_percent, null);
      const links = await db.query("SELECT tourist_site_id FROM public.service_tourist_sites");
      assert.equal(links.rows[0].tourist_site_id, citySite);
    });

    await check("Calcula 50%, fracciones y ofertas gratuitas", async () => {
      for (const [regular, promotional, percent] of [
        [10000, 5000, 50],
        [9999, 3333, 66.67],
        [10000, 0, 100],
        [10000, 10000, 0],
      ]) {
        const result = await db.query(
          `
          UPDATE public.promotions
          SET regular_price_cents = $1, promotional_price_cents = $2
          RETURNING discount_percent
        `,
          [regular, promotional],
        );
        assert.equal(Number(result.rows[0].discount_percent), percent);
      }
    });

    await check("Rechaza precios incompletos, negativos o superiores al regular", async () => {
      for (const [regular, promotional] of [
        [100, null],
        [null, 50],
        [0, 0],
        [100, -1],
        [100, 101],
      ]) {
        await assert.rejects(
          db.query(
            `
          UPDATE public.promotions
          SET regular_price_cents = $1, promotional_price_cents = $2
        `,
            [regular, promotional],
          ),
          /promotions_prices_check/,
        );
      }
    });

    await check("Asocia un hotel a dos sitios y elimina selecciones repetidas", async () => {
      await db.query("SELECT public.set_service_tourist_sites($1, $2::uuid[])", [
        serviceId,
        [citySite, oldTown, oldTown],
      ]);
      const links = await db.query("SELECT * FROM public.service_tourist_sites");
      assert.equal(links.rows.length, 2);
    });

    await check("Una ubicación inexistente no modifica las asociaciones", async () => {
      await assert.rejects(
        db.query("SELECT public.set_service_tourist_sites($1, $2::uuid[])", [
          serviceId,
          ["00000000-0000-0000-0000-000000000099"],
        ]),
        /no existe/,
      );
      const links = await db.query("SELECT * FROM public.service_tourist_sites");
      assert.equal(links.rows.length, 2);
    });

    await check("Sincroniza escrituras autorizadas en el campo anterior", async () => {
      await db.query(
        "SELECT set_config('request.jwt.claim.sub', $1, false)",
        [memberId],
      );
      await db.exec("SET ROLE authenticated");
      await db.query("UPDATE public.services SET tourist_site_id = $1 WHERE id = $2", [
        oldTown,
        serviceId,
      ]);
      await db.exec("RESET ROLE");
      const links = await db.query("SELECT tourist_site_id FROM public.service_tourist_sites");
      assert.deepEqual(
        links.rows.map((link) => link.tourist_site_id),
        [oldTown],
      );
    });

    await check("Oculta asociaciones de borradores y bloquea escrituras públicas", async () => {
      await db.query(
        "SELECT set_config('request.jwt.claim.sub', $1, false)",
        [adminId],
      );
      await db.query("UPDATE public.services SET status = 'draft' WHERE id = $1", [serviceId]);
      await db.exec("SET ROLE anon");
      const result = await db.query("SELECT * FROM public.service_tourist_sites");
      assert.equal(result.rows.length, 0);
      await assert.rejects(
        db.query("SELECT public.set_service_tourist_sites($1, $2::uuid[])", [
          serviceId,
          [citySite],
        ]),
        /permission denied/,
      );
      await db.exec("RESET ROLE");
    });

    await check("Permite quitar todas las ubicaciones sin dejar un sitio principal", async () => {
      await db.query("SELECT public.set_service_tourist_sites($1, $2::uuid[])", [serviceId, []]);
      const service = await db.query("SELECT tourist_site_id FROM public.services WHERE id = $1", [
        serviceId,
      ]);
      assert.equal(service.rows[0].tourist_site_id, null);
      const links = await db.query("SELECT * FROM public.service_tourist_sites");
      assert.equal(links.rows.length, 0);
    });
  } finally {
    await db.close();
  }
});
