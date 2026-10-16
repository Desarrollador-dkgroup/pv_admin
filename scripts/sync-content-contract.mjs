import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(root, "../panama-viajero");
const migrations = [
  "supabase/migrations/202610120001_promotions_and_service_sites.sql",
  "supabase/migrations/202610120002_replace_service_sites.sql",
  "supabase/migrations/202610150001_lodging_restaurant_galleries.sql",
  "supabase/migrations/202610150002_padmin_access_and_catalog_details.sql",
  "supabase/migrations/202610150003_restaurant_menu_link_and_gallery.sql",
  "supabase/migrations/202610150004_platform_account_roles.sql",
];

// Genera un solo archivo transaccional para ejecutar manualmente en Supabase.
const migrationSql = await Promise.all(
  migrations.map((path) => readFile(resolve(root, path), "utf8")),
);
const sql = [
  "-- Ejecutar una sola vez en la base compartida por ambas aplicaciones.",
  "BEGIN;",
  ...migrationSql.map((content) =>
    content.replace(/^BEGIN;\s*/, "").replace(/\s*COMMIT;\s*$/, ""),
  ),
  "COMMIT;",
].join("\n\n");
await writeFile(resolve(root, "supabase/APLICAR_EN_SUPABASE.sql"), sql);

// Mantiene copias idénticas sin crear dependencias de compilación entre repositorios.
for (const path of [
  "src/types/content.ts",
  ...migrations,
  "supabase/APLICAR_EN_SUPABASE.sql",
  "supabase/verify-content.sql",
  "supabase/verify-lodging-restaurants.sql",
]) {
  await mkdir(dirname(resolve(publicRoot, path)), { recursive: true });
  await copyFile(resolve(root, path), resolve(publicRoot, path));
}
console.log("Contrato y SQL sincronizados entre padmin y Panamá Viajero.");
