import { previewSeed } from "@/data/preview";
import type { PreviewData } from "@/types/preview";

const storageKey = "padmin-preview-v1";
const listeners = new Set<() => void>();
let previousRaw: string | null = null;
let snapshot = previewSeed;

// Mantiene una referencia estable para useSyncExternalStore y permite renderizado del servidor.
export function getPreviewSnapshot(): PreviewData {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(storageKey);
  } catch {
    return snapshot;
  }
  if (raw === previousRaw) return snapshot;
  previousRaw = raw;
  try {
    const parsed = raw ? (JSON.parse(raw) as PreviewData) : previewSeed;
    snapshot =
      Array.isArray(parsed.entities) && Array.isArray(parsed.history) ? parsed : previewSeed;
  } catch {
    snapshot = previewSeed;
  }
  return snapshot;
}

// El servidor siempre muestra la misma semilla y no conserva datos de un navegador.
export function getPreviewServerSnapshot(): PreviewData {
  return previewSeed;
}

// Notifica cambios locales y sincroniza otras pestañas del mismo navegador.
export function subscribePreview(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

// Guarda únicamente datos de prueba; nunca almacena contraseñas ni escribe en Supabase.
export function savePreview(data: PreviewData) {
  window.localStorage.setItem(storageKey, JSON.stringify(data));
  listeners.forEach((callback) => callback());
}

export function resetPreview() {
  window.localStorage.removeItem(storageKey);
  previousRaw = null;
  snapshot = previewSeed;
  listeners.forEach((callback) => callback());
}
