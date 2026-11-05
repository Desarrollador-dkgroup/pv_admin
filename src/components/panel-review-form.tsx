"use client";

import { useActionState, useState } from "react";
import { approveServiceAction, requestChangesAction } from "@/app/panel/revision/actions";
import { Panel } from "@/components/ui";

// Decisión de revisión: aprobar y publicar, o devolver al negocio con un motivo.
export function ReviewDecisionForm({ serviceId }: { serviceId: string }) {
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [state, rejectAction, rejecting] = useActionState(requestChangesAction, { error: "" });

  return (
    <Panel>
      <div>
        <h2>Decisión</h2>
        <p className="muted">El negocio recibe un aviso en Notificaciones con tu respuesta.</p>
      </div>
      <div className="choice-cards" role="radiogroup" aria-label="Decisión">
        <button type="button" role="radio" aria-checked={decision === "approve"}
          className={`choice-card ${decision === "approve" ? "selected success" : ""}`}
          onClick={() => setDecision("approve")}>
          <b>Aprobar</b>
          <small>El servicio queda aprobado y se publica en la web.</small>
        </button>
        <button type="button" role="radio" aria-checked={decision === "reject"}
          className={`choice-card ${decision === "reject" ? "selected danger" : ""}`}
          onClick={() => setDecision("reject")}>
          <b>Solicitar cambios</b>
          <small>Vuelve al negocio con tu motivo para corregir.</small>
        </button>
      </div>
      {decision === "approve" ? (
        <form action={approveServiceAction} className="actions end">
          <input type="hidden" name="service_id" value={serviceId} />
          <button type="submit" className="button primary">Aprobar y publicar</button>
        </form>
      ) : (
        <form action={rejectAction} className="review-form">
          <input type="hidden" name="service_id" value={serviceId} />
          <label className="field">
            Motivo para corregir
            <textarea name="review_comment" rows={4} required
              placeholder="Explica qué debe corregir el negocio." />
            <small className="muted">Se muestra tal cual al propietario.</small>
          </label>
          {state.error && <p role="alert" className="form-error">{state.error}</p>}
          <div className="actions end">
            <button type="submit" className="button danger" disabled={rejecting}>
              {rejecting ? "Enviando…" : "Solicitar cambios"}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}
