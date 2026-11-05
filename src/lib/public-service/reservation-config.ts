// Tipo de reserva por categoría (src/constants/reservation-demo-data.ts de la app).

export type ReservationKind = "table" | "activity" | "request";

const KIND_BY_CATEGORY: Record<string, ReservationKind | undefined> = {
  restaurantes: "table",
  actividades: "activity",
  "tour-operador": "activity",
  transporte: "request",
  otras: "request",
};

export const PRICE_MEANING: Record<string, string> = {
  hospedaje: "Precio por noche desde",
  restaurantes: "Gasto promedio por persona",
  actividades: "Precio por persona",
  transporte: "Tarifa desde",
  "tour-operador": "Precio por persona",
  otras: "Precio desde",
};

const PER_PERSON_CATEGORIES = new Set(["actividades", "tour-operador"]);

export type ReservationConfig = {
  kind: ReservationKind;
  categoryId: string;
  title: string;
  dateLabel: string;
  guestsLabel: string;
  guestNoun: { one: string; many: string };
  slots: string[] | null;
  slotsHint: string | null;
  pricePerPerson: boolean;
  priceMeaning: string;
  formNote: string | null;
};

// Horas de media en media hora desde la apertura hasta una hora antes del cierre.
export function reservationSlots(from: string, to: string): string[] {
  const toMinutes = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + (minutes || 0);
  };
  const slots: string[] = [];
  for (let time = toMinutes(from); time <= toMinutes(to) - 60; time += 30) {
    slots.push(`${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60)
      .padStart(2, "0")}`);
  }
  return slots;
}

// "13:30" → "1:30 p. m.", como en la app.
export function formatSlot(slot: string): string {
  const [hours, minutes] = slot.split(":").map(Number);
  const suffix = hours >= 12 ? "p. m." : "a. m.";
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes || 0).padStart(2, "0")} ${suffix}`;
}

export function reservationConfigFor(categoryId: string, item: {
  name: string;
  schedule: string[];
  hours: { from: string; to: string } | null;
}): ReservationConfig | null {
  const kind = KIND_BY_CATEGORY[categoryId];
  if (!kind) return null;
  const base = {
    kind,
    categoryId,
    priceMeaning: PRICE_MEANING[categoryId] ?? "Precio desde",
    pricePerPerson: PER_PERSON_CATEGORIES.has(categoryId),
  };

  if (kind === "table") {
    return {
      ...base,
      title: "Reservar mesa",
      dateLabel: "Fecha",
      guestsLabel: "Personas",
      guestNoun: { one: "persona", many: "personas" },
      slots: item.hours ? reservationSlots(item.hours.from, item.hours.to) : null,
      slotsHint: item.hours
        ? `Horario: ${formatSlot(item.hours.from)} a ${formatSlot(item.hours.to)}`
        : null,
      formNote: null,
    };
  }

  if (kind === "activity") {
    const schedule = item.schedule.length > 0 ? item.schedule : null;
    return {
      ...base,
      title: categoryId === "tour-operador" ? "Reservar tour" : "Reservar actividad",
      dateLabel: "Fecha",
      guestsLabel: "Participantes",
      guestNoun: { one: "participante", many: "participantes" },
      slots: schedule,
      slotsHint: schedule
        ? "Salidas de este servicio"
        : "Este servicio no tiene horarios definidos, así que no se pide hora.",
      formNote: null,
    };
  }

  return {
    ...base,
    title: "Solicitud de reserva",
    dateLabel: "Fecha deseada",
    guestsLabel: "Personas",
    guestNoun: { one: "persona", many: "personas" },
    slots: null,
    slotsHint: null,
    formNote: `${item.name} no tiene rutas, horarios ni disponibilidad publicados: la solicitud ` +
      "solo indica la fecha deseada y cuántas personas.",
  };
}

export function formatGuests(config: ReservationConfig, guests: number): string {
  return `${guests} ${guests === 1 ? config.guestNoun.one : config.guestNoun.many}`;
}

export function reservationPriceLine(
  config: ReservationConfig,
  price: number,
  guests: number | null,
): string {
  if (config.pricePerPerson && guests !== null) {
    return `Total estimado: $${price * guests} · ${formatGuests(config, guests)} × $${price}`;
  }
  if (config.pricePerPerson) return `Precio: $${price} por persona`;
  return `${config.priceMeaning} $${price}`;
}
