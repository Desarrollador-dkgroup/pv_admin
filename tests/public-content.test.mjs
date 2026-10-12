import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const publicRoot = resolve("../panama-viajero");

// Carga las funciones públicas con una conexión simulada sin acceder a Supabase.
function loadPublicModule(path, supabase) {
  const source = readFileSync(resolve(publicRoot, path), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  const imports = (name) => {
    if (name === "@/lib/supabase") return { getSupabaseServerClient: () => supabase };
    if (name === "@/types/content") return loadPublicModule("src/types/content.ts", supabase);
    throw new Error(`Importación inesperada: ${name}`);
  };
  new Function("require", "exports", outputText)(imports, exports);
  return exports;
}

// Simula filtros reales para comprobar asociaciones, duplicados y estados publicados.
function createClient(tables, errors = {}) {
  return {
    from(table) {
      let rows = tables[table] ?? [];
      const query = {
        select() {
          return query;
        },
        eq(column, value) {
          rows = rows.filter((row) => row[column] === value);
          return query;
        },
        in(column, values) {
          rows = rows.filter((row) => values.includes(row[column]));
          return query;
        },
        then(callback) {
          return Promise.resolve({ data: rows, error: errors[table] ?? null }).then(callback);
        },
      };
      return query;
    },
  };
}

test("El hotel aparece en Ciudad de Panamá y Casco Antiguo sin duplicados", async () => {
  const client = createClient({
    services: [
      { id: "hotel", tourist_site_id: "ciudad", status: "published" },
      { id: "borrador", tourist_site_id: "casco", status: "draft" },
    ],
    service_tourist_sites: [
      { service_id: "hotel", tourist_site_id: "ciudad" },
      { service_id: "hotel", tourist_site_id: "casco" },
      { service_id: "borrador", tourist_site_id: "casco" },
    ],
  });
  const { getSiteServices } = loadPublicModule("src/lib/tourist-site-services.ts", client);
  for (const site of ["ciudad", "casco"]) {
    const results = await getSiteServices(site);
    assert.deepEqual(
      results.map((service) => service.id),
      ["hotel"],
    );
  }
});

test("La web sigue leyendo el sitio principal mientras se aplica el SQL", async () => {
  const client = createClient(
    {
      services: [{ id: "hotel", tourist_site_id: "ciudad", status: "published" }],
    },
    { service_tourist_sites: { code: "PGRST205" } },
  );
  const { getSiteServices } = loadPublicModule("src/lib/tourist-site-services.ts", client);
  assert.equal((await getSiteServices("ciudad"))[0].id, "hotel");
});

test("El catálogo recibe los nombres de ambas ubicaciones para buscarlas", async () => {
  const client = createClient({
    service_tourist_sites: [
      { service_id: "hotel", tourist_site_id: "ciudad" },
      { service_id: "hotel", tourist_site_id: "casco" },
    ],
    tourist_sites: [
      { id: "ciudad", name: "Ciudad de Panamá" },
      { id: "casco", name: "Casco Antiguo" },
    ],
  });
  const { getServiceSiteNames } = loadPublicModule("src/lib/service-site-names.ts", client);
  assert.deepEqual((await getServiceSiteNames(client, ["hotel"])).get("hotel"), [
    "Ciudad de Panamá",
    "Casco Antiguo",
  ]);
});

test("La promoción usa precios reales y conserva registros anteriores sin precios", () => {
  const { mapPromotion } = loadPublicModule("src/lib/promotions.ts");
  const row = {
    id: "oferta",
    slug: "oferta",
    title: "Oferta",
    place_name: "Panamá",
    tags: "",
    discount_value: "Anterior",
    discount_suffix: "",
    price_line: "Consultar",
    valid_from: "2026-10-01",
    valid_to: "2026-10-31",
    destination_kind: "service",
  };
  const legacy = mapPromotion(row, Date.parse("2026-10-12"));
  assert.equal(legacy.regularPriceCents, null);
  assert.equal(legacy.priceLine, "Consultar");
  const current = mapPromotion(
    {
      ...row,
      regular_price_cents: 10000,
      promotional_price_cents: 5000,
      discount_percent: 50,
      description: "Oferta real",
      inclusions: ["Desayuno"],
    },
    Date.parse("2026-10-12"),
  );
  assert.equal(current.discountValue, "-50%");
  assert.equal(current.priceLine, "$50.00");
  assert.deepEqual(current.inclusions, ["Desayuno"]);
});
