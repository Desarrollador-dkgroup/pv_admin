// Contrato compartido con la web pública para los campos de promociones.
export type PromotionContent = {
  description: string | null;
  conditions: string | null;
  inclusions: string[];
  exclusions: string[];
  schedule_details: string | null;
  regular_price_cents: number | null;
  promotional_price_cents: number | null;
  currency: "USD";
};

// Representa el porcentaje calculado por PostgreSQL; el formulario no lo escribe.
export type PromotionDatabaseContent = PromotionContent & {
  discount_percent: number | null;
};

// Valida precios completos, enteros y expresados en centavos antes de guardar.
export function validatePromotionPrices(content: PromotionContent): void {
  const regular = content.regular_price_cents;
  const promotional = content.promotional_price_cents;

  if (regular === null && promotional === null) return;
  if (regular === null || promotional === null) {
    throw new Error("Completa el precio regular y el precio promocional.");
  }

  if (
    !Number.isSafeInteger(regular) ||
    !Number.isSafeInteger(promotional) ||
    regular <= 0 ||
    promotional < 0 ||
    promotional > regular
  ) {
    throw new Error(
      "Los precios deben ser centavos válidos y la oferta no puede superar al regular.",
    );
  }
}

// Presenta importes sin confundir centavos almacenados con dólares visibles.
export function formatPromotionPrice(cents: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
  }).format(cents / 100);
}

// Muestra el porcentaje con el mismo redondeo de dos decimales que utiliza PostgreSQL.
export function formatPromotionDiscount(percent: number): string {
  return `-${new Intl.NumberFormat("es-PA", { maximumFractionDigits: 2 }).format(percent)}%`;
}
