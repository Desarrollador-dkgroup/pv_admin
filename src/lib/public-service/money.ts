// Formato de precios igual que la web: siempre dos decimales ($100.00, $22.61).

// Importe en dólares (no centavos).
export function formatPrice(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "";
  return `$${amount.toFixed(2)}`;
}
