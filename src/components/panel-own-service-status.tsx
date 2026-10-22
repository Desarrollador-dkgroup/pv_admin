"use client";

import { deleteOwnServiceAction, withdrawReviewAction } from "@/app/panel/actions";
import { ownerStateOf } from "@/lib/panel-labels";

const NOTICES: Record<string, string> = {
  pending: "Está en revisión. El equipo lo revisará y te avisará en notificaciones.",
  rejected: "Fue devuelto con correcciones. Revisa la ficha y vuelve a enviarla.",
  approved: "Aprobado. Puedes publicarlo cuando quieras desde la lista de servicios.",
  published: "Publicado y visible en la web.",
  draft: "Borrador. Cuando esté listo, envíalo a revisión.",
};

// Muestra el estado del servicio y permite eliminarlo o retirarlo de revisión con confirmación.
export function OwnServiceStatusPanel({
  serviceId,
  name,
  status,
  reviewStatus,
}: {
  serviceId: string;
  name: string;
  status: string | null;
  reviewStatus: string | null;
}) {
  const state = ownerStateOf({ status, review_status: reviewStatus });
  const pending = reviewStatus === "pending" && status !== "published";
  const notice = NOTICES[status === "published" ? "published" : reviewStatus ?? "draft"];

  return (
    <section className="panel" style={{ padding: 16, display: "grid", gap: 10 }}>
      <strong>Estado: {state.label}</strong>
      <small className="muted">{notice}</small>
      {pending ? (
        <form action={withdrawReviewAction}>
          <input type="hidden" name="service_id" value={serviceId} />
          <button
            className="button secondary"
            type="submit"
            onClick={(event) => {
              if (!window.confirm(
                "¿Seguro que quieres eliminar la revisión? El servicio volverá a borrador."
              )) {
                event.preventDefault();
              }
            }}
          >
            Eliminar revisión
          </button>
        </form>
      ) : (
        <form action={deleteOwnServiceAction}>
          <input type="hidden" name="service_id" value={serviceId} />
          <button
            className="button secondary"
            type="submit"
            onClick={(event) => {
              const extra = status === "published" ? " Dejará de verse en la web." : "";
              if (!window.confirm(
                `¿Seguro que quieres eliminar "${name}"? No se puede deshacer.${extra}`
              )) {
                event.preventDefault();
              }
            }}
          >
            Eliminar servicio
          </button>
        </form>
      )}
    </section>
  );
}
