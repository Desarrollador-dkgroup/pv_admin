import type { PreviewData, PreviewRole } from "../types/preview";

export type PreviewNotification = {
  id: string;
  title: string;
  summary: string;
  description: string;
  href: string;
  action: string;
};

// Comparte los avisos del resumen y la página, limitando propietarios a su negocio.
export function getPreviewNotifications(data: PreviewData, role: PreviewRole) {
  const base = `/vista-previa/${role}`;
  const notifications: PreviewNotification[] = [];
  for (const entity of data.entities) {
    if (role === "propietario" && entity.business !== "Hotel Casa Casco") continue;
    const isContent = ["services", "promotions"].includes(entity.kind);
    const section = entity.kind === "services" ? "servicios" : "promociones";
    if (isContent && entity.status === "En revisión") {
      notifications.push({
        id: `revision-${entity.id}`,
        title: role === "admin" ? "Contenido pendiente de revisión" : "Cambios en revisión",
        summary: entity.name,
        description:
          role === "admin"
            ? `${entity.business} tiene cambios en «${entity.name}» que requieren revisión.`
            : `Los cambios de «${entity.name}» están pendientes de revisión del administrador.`,
        href:
          role === "admin" ? `${base}/revision/${entity.id}` : `${base}/${section}/${entity.id}`,
        action: role === "admin" ? "Revisar contenido" : "Ver contenido",
      });
    } else if (
      role === "propietario" &&
      isContent &&
      entity.status === "Borrador" &&
      entity.fields.review_comment
    ) {
      notifications.push({
        id: `correcciones-${entity.id}`,
        title: "Observaciones del administrador",
        summary: entity.name,
        description: entity.fields.review_comment,
        href: `${base}/${section}/${entity.id}`,
        action: "Revisar observaciones",
      });
    } else if (role === "propietario" && isContent && entity.status === "Publicado") {
      notifications.push({
        id: `publicado-${entity.id}`,
        title: "Contenido publicado",
        summary: entity.name,
        description: `«${entity.name}» tiene estado publicado en el recorrido de prueba.`,
        href: `${base}/${section}/${entity.id}`,
        action: "Ver contenido",
      });
    } else if (
      role === "admin" &&
      entity.kind === "owners" &&
      entity.status === "Invitación enviada"
    ) {
      notifications.push({
        id: `invitacion-${entity.id}`,
        title: "Invitación pendiente",
        summary: entity.name,
        description: `${entity.name}, de ${entity.business}, tiene una invitación pendiente.`,
        href: `${base}/propietarios/${entity.id}`,
        action: "Ver acceso",
      });
    }
  }
  return notifications;
}
