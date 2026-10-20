import type { EntityKind } from "@/types/preview";

export type FieldDefinition = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "email" | "textarea";
  required?: boolean;
};

// Mantiene los campos específicos separados de los componentes del formulario.
export const categoryFields: Record<string, FieldDefinition[]> = {
  hospedaje: [
    { key: "lodging_type", label: "Tipo de alojamiento" },
    { key: "meal_plan", label: "Plan de alimentación" },
    { key: "amenities", label: "Comodidades" },
  ],
  restaurantes: [
    { key: "cuisine", label: "Tipo de cocina" },
    { key: "schedule", label: "Horario" },
    { key: "payment_methods", label: "Métodos de pago" },
    { key: "price", label: "Precio desde (USD)", type: "number", required: true },
  ],
  actividades: [
    { key: "duration", label: "Duración" },
    { key: "requirements", label: "Requisitos" },
    { key: "meeting_point", label: "Punto de encuentro" },
    { key: "price", label: "Precio desde (USD)", type: "number", required: true },
  ],
  transporte: [
    { key: "route", label: "Origen y destino" },
    { key: "capacity", label: "Capacidad de pasajeros", type: "number" },
    { key: "departures", label: "Salidas" },
    { key: "price", label: "Precio desde (USD)", type: "number", required: true },
  ],
  "tour-operador": [
    { key: "duration", label: "Duración" },
    { key: "itinerary", label: "Itinerario" },
    { key: "meeting_point", label: "Punto de encuentro" },
    { key: "price", label: "Precio desde (USD)", type: "number", required: true },
  ],
};

export const entityFields: Partial<Record<EntityKind, FieldDefinition[]>> = {
  businesses: [
    { key: "description", label: "Descripción", type: "textarea" },
    { key: "owner", label: "Propietario" },
    { key: "email", label: "Correo", type: "email" },
  ],
  sites: [
    { key: "slug", label: "Identificador de URL", required: true },
    { key: "province", label: "Provincia", required: true },
    { key: "short_description", label: "Descripción breve" },
    { key: "description", label: "Descripción completa", type: "textarea" },
  ],
  rooms: [
    { key: "description", label: "Descripción", type: "textarea" },
    { key: "capacity", label: "Capacidad", type: "number", required: true },
    { key: "beds", label: "Camas", required: true },
    { key: "price", label: "Precio por noche (USD)", type: "number", required: true },
    { key: "units", label: "Unidades disponibles", type: "number", required: true },
    { key: "amenities", label: "Comodidades" },
  ],
  dishes: [
    { key: "section", label: "Sección", required: true },
    { key: "description", label: "Descripción", type: "textarea" },
    { key: "price", label: "Precio (USD)", type: "number", required: true },
  ],
};

export const sectionKinds: Record<string, EntityKind> = {
  servicios: "services",
  negocios: "businesses",
  propietarios: "owners",
  sitios: "sites",
  promociones: "promotions",
  habitaciones: "rooms",
  menu: "dishes",
};
export const kindRoutes: Record<EntityKind, string> = {
  services: "servicios",
  businesses: "negocios",
  owners: "propietarios",
  sites: "sitios",
  promotions: "promociones",
  rooms: "habitaciones",
  dishes: "menu",
};
export const kindTitles: Record<EntityKind, string> = {
  services: "Servicios",
  businesses: "Negocios",
  owners: "Propietarios",
  sites: "Sitios turísticos",
  promotions: "Promociones",
  rooms: "Habitaciones",
  dishes: "Menú del restaurante",
};
