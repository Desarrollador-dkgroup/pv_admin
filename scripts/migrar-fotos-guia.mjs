// Copia las imágenes de la guía antigua (API de D1 y R2) a la galería de sitios de Supabase.
// Solo imágenes: no toca textos, mapas ni actividades. Empareja los sitios por slug.
// Uso, desde la raíz del repo, con .env.local (NEXT_PUBLIC_SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY con la clave secreta de Supabase):
//   node --env-file=.env.local scripts/migrar-fotos-guia.mjs            informe, no escribe
//   node --env-file=.env.local scripts/migrar-fotos-guia.mjs --aplicar  sube y guarda
// Es idempotente: omite los sitios cuya galería ya tiene más de una foto.
import { randomUUID } from "node:crypto";
// sharp llega con Next (dependencia de next); aquí solo compara imágenes, no las modifica.
import sharp from "sharp";

const GUIDE_API = process.env.GUIDE_API_URL
  ?? "https://panama-viajero-api.desarrollo-dkgroup.workers.dev";
const BUCKET = "site-media";
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PHOTOS = 30;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
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

async function download(url) {
  const response = await request(url);
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  return { bytes: Buffer.from(await response.arrayBuffer()), type };
}

// Huella visual de 16 × 16 en gris. Las portadas del catálogo son los banners de la guía
// recomprimidos: los bytes difieren, pero la huella casi no cambia.
const fingerprint = (bytes) => sharp(bytes).resize(16, 16, { fit: "fill" }).greyscale().raw()
  .toBuffer();
function looksSame(first, second) {
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference += Math.abs(first[index] - second[index]);
  }
  return difference / first.length < 8;
}
const publicPhotoUrl = (path) => (path.startsWith("http")
  ? path
  : `${base}/storage/v1/object/public/catalog-photos/${path}`);

// Orden de la guía: el banner primero y después la galería según su orden.
function guideOrder(images) {
  return [...images].sort((first, second) => {
    if (first.imageType !== second.imageType) return first.imageType === "banner" ? -1 : 1;
    return first.sortOrder - second.sortOrder;
  });
}

async function upload(siteId, bytes, type) {
  const extension = type === "image/png" ? "png" : type === "image/jpeg" ? "jpg" : "webp";
  const path = `${siteId}/${randomUUID()}.${extension}`;
  await request(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...auth, "content-type": type, "x-upsert": "false" },
    body: bytes,
  });
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function saveGallery(siteId, paths) {
  await request(`${base}/rest/v1/rpc/padmin_set_tourist_site_photos`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ p_site_id: siteId, p_paths: paths }),
  });
}

const { sites: guideSites } = await (await request(`${GUIDE_API}/api/v1/public/sites`)).json();
const sites = await (await request(
  `${base}/rest/v1/tourist_sites?select=id,slug`, { headers: auth },
)).json();
const rows = await (await request(
  `${base}/rest/v1/tourist_site_photos?select=tourist_site_id,storage_path&order=position`,
  { headers: auth },
)).json();

const galleries = new Map();
for (const row of rows) {
  const list = galleries.get(row.tourist_site_id) ?? [];
  galleries.set(row.tourist_site_id, [...list, row.storage_path]);
}
const bySlug = new Map(sites.map((site) => [site.slug, site]));
const report = { sitios: 0, fotos: 0, repetidas: 0, sinPareja: [], omitidos: [], rechazadas: [] };

for (const guideSite of guideSites) {
  const site = bySlug.get(guideSite.slug);
  if (!site) {
    report.sinPareja.push(guideSite.slug);
    continue;
  }
  const current = galleries.get(site.id) ?? [];
  if (current.length > 1) {
    report.omitidos.push(guideSite.slug);
    continue;
  }
  // La portada actual se conserva primera; las imágenes idénticas a ella no se repiten.
  const paths = [...current];
  const seen = [];
  for (const path of current) {
    seen.push(await fingerprint((await download(publicPhotoUrl(path))).bytes));
  }
  for (const image of guideOrder(guideSite.images ?? [])) {
    const { bytes, type } = await download(`${GUIDE_API}${image.url}`);
    const print = await fingerprint(bytes);
    if (seen.some((other) => looksSame(other, print))) {
      report.repetidas += 1;
      continue;
    }
    if (bytes.length > MAX_BYTES || !ALLOWED_TYPES.includes(type) || paths.length >= MAX_PHOTOS) {
      report.rechazadas.push(`${guideSite.slug}: ${image.id} (${type}, ${bytes.length} bytes)`);
      continue;
    }
    seen.push(print);
    paths.push(apply ? await upload(site.id, bytes, type) : `nueva:${image.id}`);
    report.fotos += 1;
  }
  if (apply) await saveGallery(site.id, paths);
  report.sitios += 1;
  console.log(`${apply ? "Migrado" : "Por migrar"}: ${guideSite.slug} (${paths.length} fotos)`);
}

console.log(apply ? "\nMigración aplicada." : "\nInforme (no se escribió nada):");
console.log(JSON.stringify(report, null, 2));
