// Idiomas que se pueden marcar en el hospedaje. Se ampliará con más idiomas después.
export const LANGUAGE_OPTIONS = ["Español", "Inglés"];

export type LodgingDetailField = {
  key: string;
  label: string;
  multiline?: boolean;
  kind?: "text" | "apartment_types";
};

// Expone campos específicos de las plantillas para cada tipo de hospedaje.
const detailsByType: Record<string, LodgingDetailField[]> = {
  hotel: [
    { key: "classification", label: "Clasificación del hotel" },
    { key: "room_count", label: "Cantidad total de habitaciones" },
    { key: "legal_operator", label: "Nombre legal del operador" },
    { key: "arrival_instructions", label: "Acceso y llegada", multiline: true },
    { key: "emergency_contact", label: "Contacto para emergencias" },
    { key: "restaurant_services", label: "Restaurantes y bares internos", multiline: true },
    { key: "hotel_services", label: "Instalaciones y servicios", multiline: true },
    { key: "accessibility", label: "Accesibilidad general", multiline: true },
    { key: "rate_rules", label: "Temporadas, cargos y reglas", multiline: true },
    { key: "meal_plan", label: "Planes de comidas e inclusiones", multiline: true },
    { key: "restaurant_menus", label: "Menús de restaurantes internos", multiline: true },
  ],
  hostal: [
    { key: "legal_operator", label: "Nombre legal del operador" },
    { key: "room_count", label: "Cantidad de dormitorios" },
    { key: "dormitory_types", label: "Dormitorios compartidos y privados", multiline: true },
    { key: "shared_spaces", label: "Zonas compartidas y horarios", multiline: true },
    { key: "hostal_services", label: "Servicios incluidos y opcionales", multiline: true },
    { key: "food_services", label: "Desayuno y otros alimentos", multiline: true },
    {
      key: "food_service_payment",
      label: "Precios y métodos de pago de alimentos",
      multiline: true,
    },
    { key: "assistance_contact", label: "Anfitrión y asistencia" },
    { key: "accessibility", label: "Accesibilidad", multiline: true },
    { key: "cohabitation_rules", label: "Reglas de convivencia", multiline: true },
    { key: "rate_rules", label: "Temporadas, cargos y reglas", multiline: true },
  ],
  resort: [
    { key: "legal_operator", label: "Nombre legal del negocio" },
    { key: "resort_style", label: "Estilo del resort" },
    { key: "unit_count", label: "Cantidad de unidades" },
    { key: "meal_plan", label: "Planes de alimentación e inclusiones", multiline: true },
    { key: "restaurants_bars", label: "Restaurantes, bares y zonas", multiline: true },
    { key: "restaurant_menus", label: "Menús vinculados al plan", multiline: true },
    { key: "facilities_activities", label: "Instalaciones y actividades", multiline: true },
    { key: "accessibility", label: "Accesibilidad del complejo", multiline: true },
    { key: "rate_rules", label: "Temporadas, tarifas y reglas", multiline: true },
  ],
  apartamento: [
    {
      key: "apartment_types",
      label: "Tipos de apartamento e inclusiones",
      kind: "apartment_types",
    },
    { key: "building_rules", label: "Reglas de la casa", multiline: true },
  ],
  casa: [
    { key: "legal_operator", label: "Nombre legal del operador" },
    { key: "property_type", label: "Tipo de vivienda" },
    { key: "exclusive_use", label: "Uso ofrecido y privacidad" },
    { key: "simultaneous_stays", label: "Estancias simultáneas" },
    { key: "sleeping_spaces", label: "Dormitorios y otros espacios para dormir", multiline: true },
    { key: "access_instructions", label: "Acceso y llegada", multiline: true },
    { key: "emergency_protocol", label: "Emergencias y protocolo", multiline: true },
    { key: "equipment_notes", label: "Equipamiento y condiciones", multiline: true },
    { key: "rate_rules", label: "Temporadas, cargos y reglas", multiline: true },
  ],
  villa: [
    { key: "legal_operator", label: "Nombre legal del operador" },
    { key: "style", label: "Estilo o categoría de la villa" },
    { key: "privacy", label: "Privacidad y exclusividad" },
    { key: "sleeping_spaces", label: "Dormitorios, camas y baños", multiline: true },
    { key: "private_services", label: "Servicios privados y opcionales", multiline: true },
    { key: "host_contact", label: "Anfitrión y asistencia" },
    { key: "emergency_protocol", label: "Emergencias y protocolo", multiline: true },
    { key: "rate_rules", label: "Temporadas, cargos y políticas", multiline: true },
  ],
  cabana: [
    { key: "legal_operator", label: "Nombre legal del operador" },
    { key: "cabin_style", label: "Estilo de cabaña" },
    { key: "road_access", label: "Acceso y condiciones del camino", multiline: true },
    { key: "water_energy", label: "Agua y energía" },
    { key: "interior_equipment", label: "Interior y equipamiento", multiline: true },
    { key: "natural_safety", label: "Entorno, riesgos y seguridad", multiline: true },
    { key: "emergency_contact", label: "Contacto para emergencias" },
    { key: "cancellation_weather", label: "Cancelaciones por clima", multiline: true },
  ],
  lodge: [
    { key: "legal_operator", label: "Nombre legal del operador" },
    { key: "environment", label: "Entorno principal" },
    { key: "unit_count", label: "Capacidad y unidades" },
    { key: "water_energy", label: "Agua, energía y conectividad" },
    { key: "food_service", label: "Alimentación incluida o disponible", multiline: true },
    { key: "activities_access", label: "Actividades, acceso y seguridad", multiline: true },
    {
      key: "meal_service_payment",
      label: "Costos de alimentos y métodos de pago",
      multiline: true,
    },
    { key: "emergency_protocol", label: "Emergencias y comunicación", multiline: true },
    { key: "climate_closures", label: "Clima, mareas y cierres", multiline: true },
    { key: "rate_rules", label: "Temporadas, tarifas y reglas", multiline: true },
  ],
  camping: [
    { key: "environment", label: "Entorno del camping" },
    { key: "site_count", label: "Cantidad de sitios y parcelas" },
    { key: "site_types", label: "Tipos de parcela o unidad", multiline: true },
    { key: "connections", label: "Electricidad, agua y desagüe", multiline: true },
    { key: "sanitary_facilities", label: "Baños, duchas y lavandería", multiline: true },
    { key: "safety_rules", label: "Clima, fuego, evacuación y reglas", multiline: true },
    { key: "arrival_instructions", label: "Acceso nocturno y llegada", multiline: true },
    { key: "emergency_contact", label: "Contacto y primeros auxilios" },
    { key: "site_accessibility", label: "Accesibilidad de conexiones y baños", multiline: true },
    { key: "activity_safety", label: "Actividades, equipo y riesgos", multiline: true },
    { key: "rate_rules", label: "Temporadas, tarifas y reglas", multiline: true },
  ],
};

const unitDetailsByType: Record<string, LodgingDetailField[]> = {
  hotel: [
    { key: "meal_plan", label: "Plan de comidas" },
    { key: "amenities", label: "Amenidades de la habitación", multiline: true },
    { key: "accessibility", label: "Accesibilidad", multiline: true },
    { key: "notes", label: "Notas de la unidad", multiline: true },
  ],
  hostal: [
    { key: "dormitory_type", label: "Tipo de dormitorio" },
    { key: "gender_policy", label: "Mixto o por género" },
    { key: "beds_in_room", label: "Camas en el dormitorio" },
    { key: "lockers", label: "Casilleros" },
    { key: "bed_privacy", label: "Privacidad de cada cama" },
    { key: "amenities", label: "Amenidades y accesibilidad", multiline: true },
  ],
  resort: [
    { key: "unit_type", label: "Tipo o categoría de unidad" },
    { key: "view_location", label: "Vista o ubicación" },
    { key: "amenities", label: "Amenidades de la unidad", multiline: true },
    { key: "accessibility", label: "Accesibilidad", multiline: true },
  ],
  apartamento: [
    { key: "apartment_type", label: "Tipo de apartamento" },
    { key: "floor", label: "Piso" },
    { key: "living_dining", label: "Sala y comedor" },
    { key: "balcony_terrace", label: "Balcón o terraza" },
    { key: "view", label: "Vista" },
    { key: "accessibility", label: "Accesibilidad" },
  ],
  casa: [
    { key: "floor", label: "Nivel o piso" },
    { key: "space_use", label: "Uso del espacio" },
    { key: "bathroom_privacy", label: "Baño privado o compartido" },
    { key: "climate_control", label: "Aire acondicionado o ventilador" },
    { key: "accessibility", label: "Accesibilidad" },
  ],
  villa: [
    { key: "floor_zone", label: "Piso o zona" },
    { key: "bathroom_privacy", label: "Baño privado o compartido" },
    { key: "climate_control", label: "Climatización" },
    { key: "storage_safe", label: "Armario o caja fuerte" },
    { key: "view", label: "Vista" },
    { key: "accessibility", label: "Accesibilidad" },
  ],
  cabana: [
    { key: "structure", label: "Tipo de estructura" },
    { key: "levels_height", label: "Niveles o altura" },
    { key: "bathroom_privacy", label: "Baño privado o compartido" },
    { key: "kitchen", label: "Cocina" },
    { key: "climate_control", label: "Climatización" },
  ],
  lodge: [
    { key: "structure", label: "Estructura" },
    { key: "unit_location", label: "Ubicación dentro del lodge" },
    { key: "climate_control", label: "Climatización" },
    { key: "water_energy", label: "Agua y electricidad" },
    { key: "accessibility", label: "Accesibilidad" },
  ],
  camping: [
    { key: "site_type", label: "Tipo de parcela o sitio" },
    { key: "dimensions_surface", label: "Dimensiones y superficie" },
    { key: "shade", label: "Sombra" },
    { key: "tent_vehicle", label: "Tienda o vehículo permitido" },
    { key: "rv_length", label: "Largo máximo de vehículo recreativo" },
    { key: "site_access", label: "Acceso pull-through o back-in" },
    { key: "privacy", label: "Privacidad y separación" },
    { key: "fire_allowed", label: "Fogata permitida" },
    { key: "accessibility", label: "Accesibilidad" },
  ],
};

// Resuelve variaciones de escritura de los identificadores de Supabase.
export function getLodgingDetailFields(typeId: string): LodgingDetailField[] {
  const type = resolveType(typeId);
  return type ? detailsByType[type] : [];
}

// Devuelve atributos adicionales de la unidad según la plantilla del hospedaje.
export function getLodgingUnitFields(typeId: string): LodgingDetailField[] {
  const type = resolveType(typeId);
  return type ? unitDetailsByType[type] : [];
}

// Normaliza nombres de catálogo para soportar guiones y variantes de escritura.
function resolveType(typeId: string) {
  const normalized = typeId.toLowerCase().replaceAll("_", "-");
  return Object.keys(detailsByType).find((key) => normalized.includes(key));
}
