import { createRequire } from "node:module";

const require = createRequire(
  "C:/Users/deept/.cache/codex-runtimes/codex-primary-runtime/"
  + "dependencies/node/node_modules/workbook-inspector.cjs",
);
const { FileBlob, SpreadsheetFile } = require("@oai/artifact-tool");

const files = [
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_lodge.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_hotel.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_hostal.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_resort.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_apartamento_turistico.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_casa_vacacional.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_villa.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_cabana.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Informacion_para_restaurantes.xlsx",
  "C:/Users/deept/OneDrive/Desktop/Plantilla_informacion_camping.xlsx",
];

for (const path of files) {
  const file = await FileBlob.load(path);
  const workbook = await SpreadsheetFile.importXlsx(file);
  const listing = await workbook.inspect({
    kind: "sheet",
    include: "id,name",
    maxChars: 3000,
  });

  console.log(`\n### ${path.split("/").at(-1)}`);
  for (const line of listing.ndjson.split("\n")) {
    if (!line.trim()) continue;
    const sheetInfo = JSON.parse(line);
    const sheet = workbook.worksheets.getItem(sheetInfo.name);
    const used = sheet.getUsedRange(true);
    const rows = used?.values ?? [];
    console.log(`-- ${sheetInfo.name} (${used?.address ?? "vacía"})`);
    for (const row of rows) {
      const cells = row
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      if (cells.length) console.log(cells.join(" | "));
    }
  }
}
