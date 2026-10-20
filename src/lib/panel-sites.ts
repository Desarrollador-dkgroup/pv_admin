// Devuelve la foto de un sitio si es una URL válida; si no, null para mostrar un marcador.
export function sitePhotoUrl(path: string | null): string | null {
  if (!path) return null;
  return path.startsWith("http") || path.startsWith("/") ? path : null;
}

// Bucket y límites de las fotos de sitios turísticos. Se usan en servidor y en formularios.
export const SITE_IMAGE_BUCKET = "site-media";
export const SITE_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const SITE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// Extensión de archivo que corresponde al tipo de imagen permitido.
export function siteImageExtension(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

// Una foto válida es una URL pública del bucket cuya carpeta es el identificador del sitio.
export function isSitePhotoUrl(url: string, siteId: string): boolean {
  const pattern = new RegExp(`/storage/v1/object/public/${SITE_IMAGE_BUCKET}/${siteId}/[^/]+$`);
  return url.startsWith("https://") && pattern.test(url);
}
