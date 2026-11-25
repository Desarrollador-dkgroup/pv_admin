// Actividades de un sitio turístico («Qué hacer en …»). El icono no se guarda: cada web lo
// elige a partir del nombre. Los límites coinciden con la tabla tourist_site_activities.
export type SiteActivity = { name: string; description: string };

export const SITE_ACTIVITY_MAX = 40;
export const SITE_ACTIVITY_NAME_MAX = 80;
export const SITE_ACTIVITY_DESCRIPTION_MAX = 600;

// Lee y valida las actividades que envía el formulario como JSON en el campo `activities`.
export function parseSiteActivities(
  raw: string,
): { activities: SiteActivity[]; error: null } | { activities: null; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw || "[]");
  } catch {
    return { activities: null, error: "No se pudieron leer las actividades. Recarga la página." };
  }
  if (!Array.isArray(data)) {
    return { activities: null, error: "No se pudieron leer las actividades. Recarga la página." };
  }
  if (data.length > SITE_ACTIVITY_MAX) {
    return { activities: null, error: `Un sitio admite hasta ${SITE_ACTIVITY_MAX} actividades.` };
  }

  const activities: SiteActivity[] = [];
  for (const [index, item] of data.entries()) {
    const value = (item ?? {}) as Record<string, unknown>;
    const name = typeof value.name === "string" ? value.name.trim() : "";
    const description = typeof value.description === "string" ? value.description.trim() : "";
    const number = index + 1;
    if (!name) return { activities: null, error: `Escribe el nombre de la actividad ${number}.` };
    if (name.length > SITE_ACTIVITY_NAME_MAX) {
      return { activities: null, error: `El nombre de la actividad ${number} es muy largo.` };
    }
    if (description.length > SITE_ACTIVITY_DESCRIPTION_MAX) {
      return { activities: null, error: `La descripción de la actividad ${number} es muy larga.` };
    }
    activities.push({ name, description });
  }
  return { activities, error: null };
}
