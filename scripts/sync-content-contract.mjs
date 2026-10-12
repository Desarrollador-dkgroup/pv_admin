import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(root, "../panama-viajero");
const migrations = [
  "supabase/migrations/202610120001_promotions_and_service_sites.sql",
  "supabase/migrations/202610120002_replace_service_sites.sql",
];

// Genera un solo archivo transaccional para ejecutar manualmente en Supabase.
const first = await readFile(resolve(root, migrations[0]), "utf8");
const second = await readFile(resolve(root, migrations[1]), "utf8");
const sql =
  "-- Ejecutar una sola vez en la base compartida por ambas aplicaciones.\n" +
  first.replace(/COMMIT;\s*$/, "") +
  second.replace(/^BEGIN;\s*/, "");
await writeFile(resolve(root, "supabase/APLICAR_EN_SUPABASE.sql"), sql);

// Mantiene copias idénticas sin crear dependencias de compilación entre repositorios.
for (const path of [
  "src/types/content.ts",
  ...migrations,
  "supabase/APLICAR_EN_SUPABASE.sql",
  "supabase/verify-content.sql",
]) {
  await mkdir(dirname(resolve(publicRoot, path)), { recursive: true });
  await copyFile(resolve(root, path), resolve(publicRoot, path));
}
console.log("Contrato y SQL sincronizados entre padmin y Panamá Viajero.");
