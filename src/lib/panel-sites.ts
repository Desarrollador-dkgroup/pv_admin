// Devuelve la URL de la foto de un sitio, o null para mostrar un marcador. Las fotos subidas
// desde el panel son URL completas; las del catálogo inicial son rutas de `catalog-photos`.
export function sitePhotoUrl(path: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return base ? `${base}/storage/v1/object/public/catalog-photos/${path}` : null;
}

// Bucket y límites de las fotos de sitios turísticos. Se usan en servidor y en formularios.
export const SITE_IMAGE_BUCKET = "site-media";
export const SITE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const SITE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const SITE_GALLERY_MAX = 30;

// Mensaje para un archivo que no se puede subir, o null si es válido.
export function sitePhotoFileError(file: File): string | null {
  if (!(SITE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `«${file.name}» no es JPG, PNG ni WebP.`;
  }
  if (file.size > SITE_IMAGE_MAX_BYTES) return `«${file.name}» pesa más de 10 MB.`;
  return null;
}

// Devuelve la lista con un elemento movido de una posición a otra (fotos, actividades…).
export function moveListItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Valida la galería que envía el formulario. Acepta fotos nuevas de la carpeta del sitio y
// las que el sitio ya tenía (por ejemplo, rutas del catálogo inicial o de la guía).
export function sitePhotosError(photos: string[], siteId: string, current: string[]) {
  if (photos.length > SITE_GALLERY_MAX) return `Un sitio admite hasta ${SITE_GALLERY_MAX} fotos.`;
  if (new Set(photos).size !== photos.length) return "Hay fotos repetidas en la galería.";
  const unknown = photos.find(
    (photo) => !isSitePhotoUrl(photo, siteId) && !current.includes(photo),
  );
  return unknown ? "Una foto no pertenece a este sitio. Vuelve a subirla." : null;
}

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
