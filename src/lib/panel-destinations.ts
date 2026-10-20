// Constantes y utilidades puras de los destinos. Se usan en servidor y en formularios.
export const DESTINATION_IMAGE_BUCKET = "destination-media";
export const DESTINATION_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const DESTINATION_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Convierte el nombre de una provincia en un identificador de URL: "Bocas del Toro" ->
// "bocas-del-toro".
export function slugFromProvince(provinceId: string): string {
  return provinceId
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Extensión de archivo que corresponde al tipo de imagen permitido.
export function extensionForImage(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}
