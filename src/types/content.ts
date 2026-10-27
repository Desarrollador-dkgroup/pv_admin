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

// Tipos para actividades y atracciones.
export type ActivitySchedule = Record<string, { start: string; end: string }>; // Ej: { start: "09:00", end: "17:00" }

export type ActivityAttraction = {
  name: string;
  description: string;
  options: string[];
  photos: Array<{
    storage_path?: string;
    position: number;
    alt_text?: string;
  }>;
};

export type ActivityContent = {
  schedule: ActivitySchedule;
  minAge: number | null;
  whatIncludes: string[];
  attractions: ActivityAttraction[];
};

export function validateActivitySchedule(schedule: ActivitySchedule): void {
  const validDays = [
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
    "domingo",
  ];

  for (const day in schedule) {
    if (!validDays.includes(day)) {
      throw new Error(
        `Día inválido: ${day}. Use: ${validDays.join(", ")}`
      );
    }

    const times = schedule[day];
    if (!times || typeof times !== "object") {
      throw new Error(`${day}: debe tener inicio y cierre.`);
    }

    const { start, end } = times;
    if (!start || !end) {
      throw new Error(`${day}: complete el inicio y el cierre.`);
    }

    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
      throw new Error(`${day}: formato HH:MM requerido.`);
    }
  }
}

export function validateActivityAttraction(
  attraction: ActivityAttraction
): void {
  if (!attraction.name || attraction.name.trim() === "") {
    throw new Error("Nombre de atracción requerido.");
  }

  if (attraction.description.length > 500) {
    throw new Error("Descripción de atracción: máximo 500 caracteres.");
  }

  if (attraction.photos.length > 5) {
    throw new Error("Máximo 5 fotos por atracción.");
  }
}
