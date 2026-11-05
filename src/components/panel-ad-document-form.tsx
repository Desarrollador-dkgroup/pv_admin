"use client";

import { useActionState } from "react";
import { uploadAdDocumentAction } from "@/app/panel/anuncios/solicitudes-actions";

// El departamento sube el documento del anuncio (PDF) que se gestionó fuera del panel.
export function AdDocumentForm({ requestId, hasDocument }: { requestId: string; hasDocument: boolean }) {
  const [state, action, pending] = useActionState(uploadAdDocumentAction, { error: "" });
  return (
    <form action={action} className="stack compact">
      <input type="hidden" name="request_id" value={requestId} />
      <label className="field dropzone">
        {hasDocument ? "Reemplazar documento del anuncio (PDF)" : "Documento del anuncio (PDF)"}
        <input type="file" name="document" accept="application/pdf" required />
        <small className="muted">Un solo PDF de hasta 10 MB.</small>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.saved && <p className="form-success" role="status">Documento guardado. Ya puedes crear el anuncio.</p>}
      <button type="submit" className="button secondary small" disabled={pending}>
        {pending ? "Subiendo…" : "Subir documento"}
      </button>
    </form>
  );
}
