"use client";

import { useActionState } from "react";
import { uploadSignedContractAction } from "@/app/panel/contratos/actions";
import { Button, Panel } from "@/components/ui";

// Sube el PDF firmado del contrato emitido de un negocio.
export function SignedContractUpload({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(uploadSignedContractAction, { error: "" });

  return (
    <Panel>
      <h2>Subir contrato firmado</h2>
      <p className="muted">Sube el PDF firmado (máximo 10 MB). Después podrás verlo aquí.</p>
      <form action={action}>
        <input type="hidden" name="business_id" value={businessId} />
        <input type="file" name="signed_pdf" accept="application/pdf" required />
        {state.error && <p className="form-error" role="alert">{state.error}</p>}
        {state.saved && <p role="status">Contrato firmado subido correctamente.</p>}
        <Button type="submit" tone="primary" disabled={pending}>
          {pending ? "Subiendo..." : "Subir contrato firmado"}
        </Button>
      </form>
    </Panel>
  );
}
