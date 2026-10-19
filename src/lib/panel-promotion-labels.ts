import { daysUntil } from "@/lib/panel-format";

// Texto corto que indica cuánto falta para que termine una promoción.
export function remainingLabel(validTo: string): string {
  const days = daysUntil(validTo);
  if (days < 0) return "Vencida";
  return days === 0 ? "Vence hoy" : `Vence en ${days} días`;
}
