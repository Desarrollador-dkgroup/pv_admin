// Utilidades para leer formularios del panel. Se usan en las acciones del servidor.

// Lee un campo de texto limpio; si no existe, devuelve una cadena vacía.
export function formText(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Convierte un campo de texto vacío en null para guardar valores opcionales.
export function nullableText(value: string): string | null {
  return value ? value : null;
}

// Interpreta una casilla de verificación: llega como "on" cuando está marcada.
export function formChecked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

// Convierte un importe en dólares escrito por la persona a centavos enteros.
// Devuelve null si el campo está vacío o no es un número válido.
export function dollarsToCents(value: string): number | null {
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

// Separa un texto con un elemento por línea y elimina las filas vacías.
export function linesToList(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

// Convierte la fecha y hora de un campo datetime-local a ISO, en la zona de Panamá (UTC-5).
// Panamá no usa horario de verano, por lo que el desfase es fijo.
export function panamaDateTimeToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00-05:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// Convierte una fecha ISO guardada en la base al valor que espera un campo datetime-local.
export function isoToPanamaInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // Restar cinco horas y leer en UTC produce la hora local de Panamá.
  const local = new Date(date.getTime() - 5 * 3_600_000);
  return local.toISOString().slice(0, 16);
}
