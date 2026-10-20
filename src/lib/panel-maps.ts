// Extrae la URL de inserción de Google Maps. Acepta el código iframe completo de
// "Compartir > Insertar un mapa" o solo la URL. Devuelve null si no es un mapa válido.
export function extractMapsEmbedUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const frame = raw.match(/src=["']([^"']+)["']/i);
  const candidate = (frame ? frame[1] : raw).replace(/&amp;/g, "&");

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  const isGoogle = url.hostname === "www.google.com" || url.hostname === "google.com";
  if (url.protocol !== "https:" || !isGoogle || !url.pathname.startsWith("/maps/embed")) {
    return null;
  }
  return url.toString();
}
