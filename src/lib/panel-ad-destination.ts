// Texto de a dónde lleva el botón «Descubrir» de un anuncio, según el alcance de su promoción.
export type PromotionForDestination = {
  title: string;
  services: { name: string; category_id: string } | { name: string; category_id: string }[] | null;
  room_types: { name: string } | { name: string }[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export function promotionDestination(promotion: PromotionForDestination): string {
  const service = first(promotion.services);
  const room = first(promotion.room_types);
  const name = service?.name ?? "Servicio";
  if (room?.name) return `${name} · ${room.name}`;
  if (service?.category_id === "hospedaje") return `${name} · todo el hospedaje`;
  return name;
}
