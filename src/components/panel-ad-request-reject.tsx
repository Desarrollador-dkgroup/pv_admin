"use client";

import { useActionState } from "react";
import { rejectAdRequestAction } from "@/app/panel/anuncios/solicitudes-actions";

// El equipo rechaza una solicitud con un motivo que verá el propietario.
export function AdRequestReject({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(rejectAdRequestAction, { error: "" });
  return (
    <form action={action} className="stack compact">
      <input type="hidden" name="request_id" value={requestId} />
      <label className="field">
        Motivo del rechazo
        <textarea name="rejection_reason" rows={2} required />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button type="submit" className="button secondary small" disabled={pending}>
        {pending ? "Rechazando…" : "Rechazar solicitud"}
      </button>
    </form>
  );
}
