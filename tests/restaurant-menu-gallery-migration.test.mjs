import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "../.validation/node_modules/@electric-sql/pglite/dist/index.js";

const lodgingId = "20000000-0000-0000-0000-000000000001";
const restaurantId = "20000000-0000-0000-0000-000000000002";

test("Menú externo y límite de treinta fotos para restaurantes", async () => {
  const db = new PGlite();

  try {
    await db.exec(`
      CREATE TABLE public.services (
        id uuid PRIMARY KEY,
        hospedaje_type_id text
      );
      CREATE TABLE public.lodging_areas (
        id uuid PRIMARY KEY,
        service_id uuid NOT NULL
      );
      CREATE TABLE public.service_photos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_id uuid NOT NULL,
        lodging_area_id uuid,
        storage_path text NOT NULL,
        is_cover boolean NOT NULL DEFAULT false,
        position smallint NOT NULL DEFAULT 0
      );
      CREATE TABLE public.restaurant_profiles (
        service_id uuid PRIMARY KEY
      );
      CREATE TABLE public.menu_dishes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        photo_storage_path text
      );
      INSERT INTO public.services (id, hospedaje_type_id)
      VALUES ('${lodgingId}', 'hotel'), ('${restaurantId}', NULL);
      INSERT INTO public.restaurant_profiles (service_id)
      VALUES ('${restaurantId}');
    `);

    const migration = await readFile(
      new URL(
        "../supabase/migrations/202610150003_restaurant_menu_link_and_gallery.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);
    await db.exec(migration);

    await db.query(
      "UPDATE public.restaurant_profiles SET menu_url = $1",
      ["https://example.com/menu"],
    );
    await assert.rejects(
      db.query("UPDATE public.restaurant_profiles SET menu_url = $1", ["javascript:alert(1)"]),
      /restaurant_profiles_menu_url_check/,
    );

    const removedPhotoColumn = await db.query(`
      SELECT count(*)::integer AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'menu_dishes'
        AND column_name = 'photo_storage_path'
    `);
    assert.equal(removedPhotoColumn.rows[0].count, 0);

    for (let index = 0; index < 30; index += 1) {
      await db.query(
        `INSERT INTO public.service_photos (service_id, storage_path)
         VALUES ($1, $2)`,
        [restaurantId, `restaurant/${index}.webp`],
      );
    }
    await assert.rejects(
      db.query(
        `INSERT INTO public.service_photos (service_id, storage_path)
         VALUES ($1, $2)`,
        [restaurantId, "restaurant/31.webp"],
      ),
      /máximo de 30 fotos/,
    );

    await db.query(
      `INSERT INTO public.service_photos (service_id, storage_path)
       VALUES ($1, $2)`,
      [lodgingId, "lodging/cover.webp"],
    );
  } finally {
    await db.close();
  }
});
