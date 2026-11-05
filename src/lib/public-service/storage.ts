// Convierte una ruta de Supabase Storage en una URL pública. El panel guarda las fotos de
// servicios en `service-media` y las de destinos en `destination-media` como rutas; las de
// sitios turísticos ya se guardan como URL completas.
export function publicMediaUrl(path: string | null | undefined, bucket = "service-media") {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("/")) return path;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

// Fotos de sitios turísticos y promociones: las que sube el panel llegan como URL completa;
// las del catálogo inicial son rutas de `catalog-photos`.
export function catalogPhotoUrl(path: string | null | undefined) {
  return publicMediaUrl(path, "catalog-photos");
}
