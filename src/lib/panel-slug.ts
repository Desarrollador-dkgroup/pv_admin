// Genera identificadores de URL a partir de un nombre: "Isla Bastimentos" -> "isla-bastimentos".
// Se usa en servidor; el usuario ya no escribe el identificador.
export function slugify(text: string, fallback: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || fallback;
}

// Intentos para un identificador único: primero el nombre tal cual; si ya existe,
// dos variantes con un sufijo corto.
export function slugCandidates(base: string): string[] {
  const suffix = () => crypto.randomUUID().slice(0, 4);
  return [base, `${base}-${suffix()}`, `${base}-${suffix()}`];
}
