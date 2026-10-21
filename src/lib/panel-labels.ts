// Textos y tonos de los estados que guarda Supabase. Los códigos se muestran en español.
export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
export type StatusLabel = { label: string; tone: BadgeTone };

export const SERVICE_STATUS: Record<string, StatusLabel> = {
  draft: { label: "Borrador", tone: "neutral" },
  published: { label: "Publicado", tone: "success" },
  suspended: { label: "Suspendido", tone: "danger" },
};

export const REVIEW_STATUS: Record<string, StatusLabel> = {
  not_submitted: { label: "Sin enviar", tone: "neutral" },
  pending: { label: "Pendiente de revisión", tone: "warning" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Devuelto con correcciones", tone: "danger" },
};

// Devuelve el texto y el tono de un estado; un código desconocido se muestra tal cual.
export function statusOf(map: Record<string, StatusLabel>, key: string | null): StatusLabel {
  if (!key) return { label: "—", tone: "neutral" };
  return map[key] ?? { label: key, tone: "neutral" };
}

// Estado que ve el propietario: une publicación y revisión en una sola etiqueta.
export function ownerStateOf(service: {
  status: string | null;
  review_status: string | null;
}): StatusLabel {
  if (service.status === "published") return { label: "Publicado", tone: "success" };
  if (service.status === "suspended") return { label: "Suspendido", tone: "danger" };
  if (service.review_status === "pending") {
    return { label: "Pendiente de revisión", tone: "warning" };
  }
  if (service.review_status === "rejected") {
    return { label: "Devuelto con correcciones", tone: "danger" };
  }
  if (service.review_status === "approved") {
    return { label: "Aprobado, listo para publicar", tone: "info" };
  }
  return { label: "Borrador", tone: "neutral" };
}
