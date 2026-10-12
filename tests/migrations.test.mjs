import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "../.validation/node_modules/@electric-sql/pglite/dist/index.js";

const serviceId = "00000000-0000-0000-0000-000000000001";
const citySite = "00000000-0000-0000-0000-000000000002";
const oldTown = "00000000-0000-0000-0000-000000000003";

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
      CREATE TABLE public.tourist_sites (id uuid PRIMARY KEY);
      CREATE TABLE public.services (
        id uuid PRIMARY KEY,
        tourist_site_id uuid REFERENCES public.tourist_sites(id),
        status text NOT NULL DEFAULT 'draft'
      );
      CREATE TABLE public.promotions (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      INSERT INTO public.promotions DEFAULT VALUES;
      INSERT INTO public.tourist_sites VALUES ('${citySite}'), ('${oldTown}');
      INSERT INTO public.services VALUES ('${serviceId}', '${citySite}', 'published');
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
