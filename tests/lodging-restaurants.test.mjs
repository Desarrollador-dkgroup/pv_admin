import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "../.validation/node_modules/@electric-sql/pglite/dist/index.js";

const hotelId = "10000000-0000-0000-0000-000000000001";
const restaurantId = "10000000-0000-0000-0000-000000000002";
const areaId = "10000000-0000-0000-0000-000000000003";
const roomTypeId = "10000000-0000-0000-0000-000000000004";
const sectionId = "10000000-0000-0000-0000-000000000005";
const foreignAreaId = "10000000-0000-0000-0000-000000000006";

test("Galerías, datos de hospedaje y reservas de restaurantes", async () => {
  const db = new PGlite();

  try {
    // Construye el esquema previo mínimo usado por la migración.
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;

      CREATE TABLE public.hospedaje_types (
        id text PRIMARY KEY
      );

      CREATE TABLE public.services (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        hospedaje_type_id text REFERENCES public.hospedaje_types(id)
      );

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

      INSERT INTO public.hospedaje_types (id) VALUES ('hotel');
      INSERT INTO public.services (id, name, hospedaje_type_id)
      VALUES
        ('${hotelId}', 'Hotel de prueba', 'hotel'),
        ('${restaurantId}', 'Restaurante de prueba', NULL);
      INSERT INTO public.restaurant_profiles (
        service_id, tag, payment_methods, hours_from, hours_to
      ) VALUES ('${restaurantId}', 'Panameña', '{}', '12:00', '22:00');
      INSERT INTO public.room_types (id, service_id)
      VALUES ('${roomTypeId}', '${hotelId}');
      INSERT INTO public.menu_sections (id, service_id, title)
      VALUES ('${sectionId}', '${restaurantId}', 'Platos fuertes');
      INSERT INTO public.menu_dishes (
        section_id, name, description, price_cents
      ) VALUES ('${sectionId}', 'Arroz con huevo', 'Plato de prueba', 500);
    `);

    const migration = await readFile(
      new URL(
        "../supabase/migrations/202610150001_lodging_restaurant_galleries.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await db.exec(migration);

    // Confirma que las propiedades existentes reciban un perfil vacío.
    const seededProfile = await db.query(
      "SELECT service_id FROM public.lodging_profiles",
    );
    assert.equal(seededProfile.rows.length, 1);
    assert.equal(seededProfile.rows[0].service_id, hotelId);

    // Guarda una imagen de portada y una ruta única por producto del menú.
    await db.query(
      `UPDATE public.menu_dishes
       SET photo_storage_path = $1`,
      ["restaurants/arroz-con-huevo.webp"],
    );
    const menuPhoto = await db.query(
      "SELECT photo_storage_path FROM public.menu_dishes",
    );
    assert.equal(
      menuPhoto.rows[0].photo_storage_path,
      "restaurants/arroz-con-huevo.webp",
    );
    await assert.rejects(
      db.query("UPDATE public.menu_dishes SET photo_storage_path = ' '"),
      /menu_dishes_photo_path_check/,
    );

    // Permite dos períodos de apertura en un mismo día.
    await db.exec(`
      INSERT INTO public.restaurant_hours (
        service_id, day_of_week, opens_at, closes_at, position
      ) VALUES
        ('${restaurantId}', 5, '12:00', '15:00', 0),
        ('${restaurantId}', 5, '18:00', '22:00', 1);
    `);
    const hours = await db.query(
      "SELECT count(*)::integer AS count FROM public.restaurant_hours",
    );
    assert.equal(hours.rows[0].count, 2);
    await assert.rejects(
      db.query(
        `INSERT INTO public.restaurant_hours (
          service_id, day_of_week, opens_at, closes_at
        ) VALUES ($1, 7, '12:00', '15:00')`,
        [restaurantId],
      ),
      /restaurant_hours_day_of_week_check/,
    );

    // Permite quince fotos generales para hospedajes y rechaza la número dieciséis.
    for (let index = 0; index < 15; index += 1) {
      await db.query(
        `INSERT INTO public.service_photos (service_id, storage_path)
         VALUES ($1, $2)`,
        [hotelId, `lodging/general-${index}.webp`],
      );
    }
    await assert.rejects(
      db.query(
        `INSERT INTO public.service_photos (service_id, storage_path)
         VALUES ($1, $2)`,
        [hotelId, "lodging/general-16.webp"],
      ),
      /máximo de 15 fotos/,
    );
    await db.query(
      `UPDATE public.service_photos
       SET is_cover = true
       WHERE service_id = $1 AND storage_path = $2`,
      [hotelId, "lodging/general-0.webp"],
    );
    await assert.rejects(
      db.query(
        `UPDATE public.service_photos
         SET is_cover = true
         WHERE service_id = $1 AND storage_path = $2`,
        [hotelId, "lodging/general-1.webp"],
      ),
      /service_photos_one_general_cover_idx/,
    );

    // Limita a diez imágenes el álbum de cada área.
    await db.query(
      `INSERT INTO public.lodging_areas (id, service_id, name)
       VALUES ($1, $2, $3)`,
      [areaId, hotelId, "Piscina"],
    );
    // Rechaza áreas asociadas a un servicio que no sea un hospedaje.
    await assert.rejects(
      db.query(
        `INSERT INTO public.lodging_areas (id, service_id, name)
         VALUES ($1, $2, $3)`,
        [foreignAreaId, restaurantId, "Área inválida"],
      ),
      /solo pueden pertenecer a un hospedaje/,
    );
    const areaResult = await db.query(
      "SELECT count(*)::integer AS count FROM public.lodging_areas",
    );
    assert.equal(areaResult.rows[0].count, 1);
    await assert.rejects(
      db.query(
        `INSERT INTO public.service_photos (
          service_id, lodging_area_id, storage_path
        ) VALUES ($1, $2, $3)`,
        [restaurantId, areaId, "restaurants/wrong-area.webp"],
      ),
      /mismo hospedaje/,
    );

    for (let index = 0; index < 10; index += 1) {
      await db.query(
        `INSERT INTO public.service_photos (
          service_id, lodging_area_id, storage_path
        ) VALUES ($1, $2, $3)`,
        [hotelId, areaId, `lodging/pool-${index}.webp`],
      );
    }
    await assert.rejects(
      db.query(
        `INSERT INTO public.service_photos (
          service_id, lodging_area_id, storage_path
        ) VALUES ($1, $2, $3)`,
        [hotelId, areaId, "lodging/pool-11.webp"],
      ),
      /máximo de 10 fotos/,
    );

    // Limita también a diez fotos cada habitación o unidad.
    for (let index = 0; index < 10; index += 1) {
      await db.query(
        `INSERT INTO public.room_type_photos (room_type_id, storage_path)
         VALUES ($1, $2)`,
        [roomTypeId, `lodging/room-${index}.webp`],
      );
    }
    await assert.rejects(
      db.query(
        `INSERT INTO public.room_type_photos (room_type_id, storage_path)
         VALUES ($1, $2)`,
        [roomTypeId, "lodging/room-11.webp"],
      ),
      /máximo de 10 fotos/,
    );

    // Limita a diez fotos generales para restaurantes.
    for (let index = 0; index < 10; index += 1) {
      await db.query(
        `INSERT INTO public.service_photos (service_id, storage_path)
         VALUES ($1, $2)`,
        [restaurantId, `restaurants/general-${index}.webp`],
      );
    }
    await assert.rejects(
      db.query(
        `INSERT INTO public.service_photos (service_id, storage_path)
         VALUES ($1, $2)`,
        [restaurantId, "restaurants/general-11.webp"],
      ),
      /máximo de 10 fotos/,
    );

    // Mantiene las tablas nuevas bloqueadas hasta definir políticas RLS.
    const rls = await db.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname IN (
        'lodging_profiles', 'lodging_areas', 'restaurant_hours'
      )
    `);
    assert.equal(rls.rows.length, 3);
    assert.ok(rls.rows.every((row) => row.relrowsecurity));

    // Adapta la verificación al esquema incremental que ya está aplicado.
    await db.exec(
      "ALTER TABLE public.restaurant_profiles ADD COLUMN menu_url text",
    );
    const verification = await readFile(
      new URL("../supabase/verify-lodging-restaurants.sql", import.meta.url),
      "utf8",
    );
    await db.exec(verification);

    await db.exec("SET ROLE anon");
    await assert.rejects(
      db.query("SELECT * FROM public.lodging_profiles"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
