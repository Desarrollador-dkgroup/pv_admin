import { createRequire } from "node:module";

const require = createRequire(
  "C:/Users/deept/.cache/codex-runtimes/codex-primary-runtime/"
  + "dependencies/node/node_modules/workbook-compare.cjs",
);
const { FileBlob, SpreadsheetFile } = require("@oai/artifact-tool");

async function loadSheet(path, name) {
  const blob = await FileBlob.load(path);
  const workbook = await SpreadsheetFile.importXlsx(blob);
  const sheet = workbook.worksheets.getItem(name);
  return sheet.getUsedRange(true).values;
}

const originalPath = "C:/Users/deept/pv_admin/outputs/01a1304f-04b5-"
  + "7972-991b-c5f451144da9/Plantilla_informacion_hostal.xlsx";
const updatedPath = "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_hostal.xlsx";
const oldRows = await loadSheet(originalPath, "Ficha del hostal");
const newRows = await loadSheet(updatedPath, "Ficha del hostal");

console.log("### Cambios en ficha general del hostal");
const rowCount = Math.max(oldRows.length, newRows.length);
for (let index = 0; index < rowCount; index += 1) {
  const oldRow = oldRows[index] ?? [];
  const newRow = newRows[index] ?? [];
  if (JSON.stringify(oldRow) !== JSON.stringify(newRow)) {
    console.log(`Fila ${index + 1}`);
    console.log(`  Antes: ${oldRow.map((value) => value ?? "").join(" | ")}`);
    console.log(`  Ahora: ${newRow.map((value) => value ?? "").join(" | ")}`);
  }
}

console.log("\n### Galerías preparadas en las plantillas");
const galleryFiles = [
  ["Hotel", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_hotel.xlsx"],
  ["Hostal", updatedPath],
  ["Resort", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_resort.xlsx"],
  ["Apartamento turístico", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_apartamento_turistico.xlsx"],
  ["Casa vacacional", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_casa_vacacional.xlsx"],
  ["Villa", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_villa.xlsx"],
  ["Cabaña", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_cabana.xlsx"],
  ["Lodge", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_lodge.xlsx"],
  ["Camping", "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_camping.xlsx"],
  ["Restaurante", "C:/Users/deept/OneDrive/Desktop/Informacion_para_restaurantes.xlsx"],
];

for (const [label, path] of galleryFiles) {
  const blob = await FileBlob.load(path);
  const workbook = await SpreadsheetFile.importXlsx(blob);
  const listing = await workbook.inspect({
    kind: "sheet",
    include: "id,name",
    maxChars: 3000,
  });
  const galleryInfo = listing.ndjson
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .find((item) => item.name.includes("Galería"));
  if (!galleryInfo) continue;
  const rows = workbook.worksheets.getItem(galleryInfo.name).getUsedRange(true).values;
  const names = rows.slice(4).map((row) => String(row[0] ?? "").trim()).filter(Boolean);
  console.log(`${label}: ${names.join("; ")}`);
}
