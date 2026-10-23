// Comodidades que se marcan por habitación. Se guardan en room_types.details.amenities como
// texto separado por comas, junto con las que el propietario escriba en "Otras".
export const ROOM_AMENITIES = [
  "Aire acondicionado",
  "Ventilador",
  "Wi-Fi",
  "Televisión",
  "Baño privado",
  "Agua caliente",
  "Minibar",
  "Refrigerador",
  "Cocineta o cocina",
  "Cafetera",
  "Caja fuerte",
  "Escritorio",
  "Armario",
  "Secador de pelo",
  "Artículos de aseo",
  "Toallas y ropa de cama",
  "Balcón o terraza",
  "Vista al mar",
  "Vista a la montaña",
  "Accesible en silla de ruedas",
];

// Une las comodidades marcadas y las escritas a mano, sin repetir ni dejar vacíos.
export function readRoomAmenities(data: FormData) {
  const checked = data.getAll("room_amenities").map((item) => String(item).trim());
  const others = String(data.get("room_amenities_other") ?? "")
    .split(",")
    .map((item) => item.trim());
  return [...new Set([...checked, ...others].filter(Boolean))].join(", ");
}

// Detalles de la habitación: campos del tipo de hospedaje (unit__*) y comodidades.
export function readRoomDetails(data: FormData) {
  const details: Record<string, string> = Object.fromEntries(
    [...data.entries()]
      .filter(([key]) => key.startsWith("unit__"))
      .map(([key, item]) => [key.slice("unit__".length), String(item).trim()]),
  );
  const amenities = readRoomAmenities(data);
  if (amenities) details.amenities = amenities;
  else delete details.amenities;
  return details;
}
