"use client";

import { startTransition } from "react";
import { deleteOwnServiceAction, withdrawReviewAction } from "@/app/panel/actions";
import { ConfirmSubmit, confirmAction } from "@/components/ui";
import { ownerStateOf } from "@/lib/panel-labels";

const NOTICES: Record<string, string> = {
  pending: "Está en revisión. El equipo lo revisará y te avisará en notificaciones.",
  rejected: "Fue devuelto con correcciones. Revisa la ficha y vuelve a enviarla.",
  approved: "Aprobado. Puedes publicarlo cuando quieras desde la lista de servicios.",
  published: "Publicado y visible en la web.",
  draft: "Borrador. Cuando esté listo, envíalo a revisión.",
};

// Muestra el estado del servicio, las correcciones pedidas por el equipo y, si está en
// revisión, permite cancelarla con confirmación.
export function OwnServiceStatusPanel({
  serviceId,
  status,
  reviewStatus,
  reviewComment,
}: {
  serviceId: string;
  status: string | null;
  reviewStatus: string | null;
  reviewComment: string | null;
}) {
  const state = ownerStateOf({ status, review_status: reviewStatus });
  const pending = reviewStatus === "pending" && status !== "published";
  const notice = NOTICES[status === "published" ? "published" : reviewStatus ?? "draft"];
  const corrections = reviewStatus === "rejected" ? reviewComment?.trim() : "";

  return (
    <section className="panel" style={{ padding: 16, display: "grid", gap: 10 }}>
      <strong>Estado: {state.label}</strong>
      <small className="muted">{notice}</small>
      {corrections && (
        <div role="note">
          <b>Correcciones solicitadas</b>
          <p style={{ margin: "4px 0 0", whiteSpace: "pre-line" }}>{corrections}</p>
        </div>
      )}
      {pending && (
        <form action={withdrawReviewAction}>
          <input type="hidden" name="service_id" value={serviceId} />
          <ConfirmSubmit tone="secondary" confirm={{
            title: "¿Cancelar la revisión?",
            body: "El servicio volverá a borrador.",
            confirmLabel: "Cancelar revisión",
          }}>
            Cancelar revisión
          </ConfirmSubmit>
        </form>
      )}
    </section>
  );
}

// Botón para eliminar el servicio desde la barra inferior del editor. No es un formulario
// propio porque vive dentro del formulario de edición.
export function DeleteOwnServiceButton({
  serviceId,
  name,
  status,
}: {
  serviceId: string;
  name: string;
  status: string;
}) {
  return (
    <button
      className="button danger"
      type="button"
      onClick={async () => {
        const extra = status === "published" ? " Dejará de verse en la web." : "";
        if (!(await confirmAction({
          title: `¿Eliminar «${name}»?`,
          body: `No se puede deshacer.${extra} Liberará un cupo de tu plan.`,
          confirmLabel: "Eliminar servicio",
          danger: true,
        }))) {
          return;
        }
        const formData = new FormData();
        formData.set("service_id", serviceId);
        startTransition(() => deleteOwnServiceAction(formData));
      }}
    >
      Eliminar servicio
    </button>
  );
}
