// Actividades de un sitio turístico. `icon` es la clave de un icono de ACTIVITY_ICONS, o ""
// para que cada web lo elija según el nombre. Los límites coinciden con la base de datos.
export type SiteActivity = { name: string; description: string; icon: string };

export const SITE_ACTIVITY_MAX = 40;
export const SITE_ACTIVITY_NAME_MAX = 80;
export const SITE_ACTIVITY_DESCRIPTION_MAX = 600;

// Iconos que se pueden elegir. Las mismas claves están en la restricción de la base, en la
// página oficial (activity-icons.ts) y en la guía (activityIcons.js).
export const ACTIVITY_ICONS = [
  { key: "playa", label: "Playa" },
  { key: "agua", label: "Agua y mar" },
  { key: "bote", label: "Bote o lancha" },
  { key: "pesca", label: "Pesca" },
  { key: "bicicleta", label: "Bicicleta" },
  { key: "comida", label: "Comida" },
  { key: "cafe", label: "Café" },
  { key: "montana", label: "Montaña" },
  { key: "bosque", label: "Bosque" },
  { key: "camping", label: "Camping" },
  { key: "estrellas", label: "Estrellas" },
  { key: "fotografia", label: "Fotografía" },
  { key: "binoculares", label: "Binoculares" },
  { key: "aves", label: "Aves" },
  { key: "recorrido", label: "Recorrido o tour" },
  { key: "cultura", label: "Cultura e historia" },
  { key: "compras", label: "Compras y artesanía" },
  { key: "isla", label: "Isla" },
  { key: "costa", label: "Costa" },
  { key: "exploracion", label: "Exploración" },
] as const;

export type ActivityIconKey = (typeof ACTIVITY_ICONS)[number]["key"];

const ICON_KEYS = new Set<string>(ACTIVITY_ICONS.map((icon) => icon.key));
const READ_ERROR = "No se pudieron leer las actividades. Recarga la página.";

type Parsed = { activities: SiteActivity[]; error: null } | { activities: null; error: string };
const fail = (error: string): Parsed => ({ activities: null, error });

// Lee y valida las actividades que envía el formulario como JSON en el campo `activities`.
export function parseSiteActivities(raw: string): Parsed {
  let data: unknown;
  try {
    data = JSON.parse(raw || "[]");
  } catch {
    return fail(READ_ERROR);
  }
  if (!Array.isArray(data)) return fail(READ_ERROR);
  if (data.length > SITE_ACTIVITY_MAX) {
    return fail(`Un sitio admite hasta ${SITE_ACTIVITY_MAX} actividades.`);
  }

  const activities: SiteActivity[] = [];
  for (const [index, item] of data.entries()) {
    const value = (item ?? {}) as Record<string, unknown>;
    const text = (field: string) => {
      const raw = value[field];
      return typeof raw === "string" ? raw.trim() : "";
    };
    const [name, description, icon] = [text("name"), text("description"), text("icon")];
    const number = index + 1;
    if (!name) return fail(`Escribe el nombre de la actividad ${number}.`);
    if (name.length > SITE_ACTIVITY_NAME_MAX) {
      return fail(`El nombre de la actividad ${number} es muy largo.`);
    }
    if (description.length > SITE_ACTIVITY_DESCRIPTION_MAX) {
      return fail(`La descripción de la actividad ${number} es muy larga.`);
    }
    if (icon && !ICON_KEYS.has(icon)) return fail(`El icono de la actividad ${number} no existe.`);
    activities.push({ name, description, icon });
  }
  return { activities, error: null };
}
