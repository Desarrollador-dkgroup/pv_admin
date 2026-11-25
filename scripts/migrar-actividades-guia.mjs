// Copia las actividades de cada sitio de la guía antigua (API de D1) a Supabase y crea los
// sitios de la Comarca Ngäbe-Buglé, que solo existían en la guía. Empareja por slug.
// Uso, desde la raíz del repo, con .env.local (NEXT_PUBLIC_SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY con la clave secreta de Supabase):
//   node --env-file=.env.local scripts/migrar-actividades-guia.mjs            informe
//   node --env-file=.env.local scripts/migrar-actividades-guia.mjs --aplicar  escribe
// Es idempotente: omite los sitios que ya tienen actividades. Las fotos de los sitios
// creados se copian después con scripts/migrar-fotos-guia.mjs.

const GUIDE_API = process.env.GUIDE_API_URL
  ?? "https://panama-viajero-api.desarrollo-dkgroup.workers.dev";
// Sitios que solo existían en la guía y se crean en Supabase (decisión del usuario).
const CREATE_PREFIX = "comarca-ngabe-bugle";
const apply = process.argv.includes("--aplicar");

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}
// Las claves secretas nuevas van solo en `apikey`; las antiguas (JWT) también en Authorization.
const auth = key.startsWith("eyJ")
  ? { apikey: key, Authorization: `Bearer ${key}` }
  : { apikey: key };

async function request(url, init = {}) {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`${response.status} en ${url}: ${await response.text()}`);
  return response;
}

const getJson = async (url) => (await request(url, { headers: auth })).json();
const postJson = (url, body, extra = {}) => request(url, {
  method: "POST",
  headers: { ...auth, "content-type": "application/json", ...extra },
  body: JSON.stringify(body),
});

// «Bocas del Toro» → «bocas-del-toro», igual que los slugs de provincia de la guía.
const slugify = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const { sites: guideSites } = await (await request(`${GUIDE_API}/api/v1/public/sites`)).json();
const sites = await getJson(`${base}/rest/v1/tourist_sites?select=id,slug`);
const provinces = await getJson(`${base}/rest/v1/provinces?select=id`);
const withActivities = new Set((await getJson(
  `${base}/rest/v1/tourist_site_activities?select=tourist_site_id&position=eq.0`,
)).map((row) => row.tourist_site_id));

const bySlug = new Map(sites.map((site) => [site.slug, site]));
const provinceBySlug = new Map(provinces.map((province) => [slugify(province.id), province.id]));
const report = { creados: [], conActividades: 0, actividades: 0, omitidos: [], sinPareja: [] };

for (const guideSite of guideSites) {
  let site = bySlug.get(guideSite.slug);
  if (!site && guideSite.slug.startsWith(CREATE_PREFIX)) {
    const province = provinceBySlug.get(guideSite.province.slug);
    if (!province) throw new Error(`Provincia desconocida: ${guideSite.province.slug}`);
    const row = {
      slug: guideSite.slug,
      name: guideSite.name,
      description: guideSite.description,
      short_description: guideSite.previewDescription,
      province_id: province,
      region_id: province,
      maps_embed_url: guideSite.mapUrl || null,
      photo_is_illustrative: false,
    };
    site = apply
      ? (await (await postJson(`${base}/rest/v1/tourist_sites`, row, {
        Prefer: "return=representation",
      })).json())[0]
      : { id: `nuevo:${guideSite.slug}`, slug: guideSite.slug };
    report.creados.push(`${guideSite.slug} (${province})`);
  }
  if (!site) {
    report.sinPareja.push(guideSite.slug);
    continue;
  }
  if (withActivities.has(site.id)) {
    report.omitidos.push(guideSite.slug);
    continue;
  }
  const activities = (guideSite.activities ?? []).map((activity) => ({
    name: activity.name,
    description: activity.description ?? "",
  }));
  if (activities.length === 0) continue;
  if (apply) {
    await postJson(`${base}/rest/v1/rpc/padmin_set_tourist_site_activities`, {
      p_site_id: site.id,
      p_activities: activities,
    });
  }
  report.conActividades += 1;
  report.actividades += activities.length;
}

console.log(apply ? "Migración aplicada." : "Informe (no se escribió nada):");
console.log(JSON.stringify(report, null, 2));
