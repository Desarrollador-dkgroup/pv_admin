// Formatos de fecha, dinero y texto usados por todo el panel.
// La zona horaria fija evita que el servidor (UTC) cambie las fechas de Panamá.
const TIME_ZONE = "America/Panama";

const dateFormat = new Intl.DateTimeFormat("es-PA", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormat = new Intl.DateTimeFormat("es-PA", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

// Muestra una fecha corta, por ejemplo "16 oct 2026", o un guion si no existe.
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

// Muestra fecha y hora, útil para avisos y actividad reciente.
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormat.format(date);
}

// Convierte centavos enteros de la base de datos en un importe visible en dólares.
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}

// Indica cuántos días faltan para una fecha; valores negativos significan que ya pasó.
export function daysUntil(value: string): number {
  const target = new Date(value).getTime();
  return Math.ceil((target - Date.now()) / 86_400_000);
}

// Pone en mayúscula la primera letra de un texto para mostrar códigos de la base.
export function capitalize(value: string | null | undefined): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("-", " ");
}
