"use client";

import { useActionState } from "react";
import { uploadSignedContractAction } from "@/app/panel/contratos/actions";
import { Button } from "@/components/ui";

// Sube el PDF firmado del contrato emitido de un negocio.
export function SignedContractUpload({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(uploadSignedContractAction, { error: "" });

  return (
    <form action={action} className="stack compact">
      <input type="hidden" name="business_id" value={businessId} />
      <label className="field dropzone">
        Copia firmada (PDF)
        <input type="file" name="signed_pdf" accept="application/pdf" required />
        <small className="muted">Un solo PDF de hasta 10 MB.</small>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.saved && (
        <p className="form-success" role="status">
          Copia subida. El equipo la verificará y te avisará.
        </p>
      )}
      <Button type="submit" tone="primary" disabled={pending}>
        {pending ? "Subiendo..." : "Subir contrato firmado"}
      </Button>
    </form>
  );
}
