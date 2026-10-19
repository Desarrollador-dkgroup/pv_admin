"use client";

import { useActionState } from "react";
import { requestChangesAction } from "@/app/panel/revision/actions";
import { Button } from "@/components/ui";

// Formulario para devolver un servicio al negocio con el motivo de los cambios.
export function ReviewRejectForm({ serviceId }: { serviceId: string }) {
  // Guarda el error y el estado de envío que devuelve la acción del servidor.
  const [state, action, pending] = useActionState(requestChangesAction, { error: "" });

  return (
    <form action={action} className="review-form">
      <input type="hidden" name="service_id" value={serviceId} />
      <label className="field">
        Motivo para corregir
        <textarea
          name="review_comment"
          rows={3}
          required
          placeholder="Explica qué debe corregir el negocio."
        />
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <Button tone="secondary" type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Solicitar cambios"}
      </Button>
    </form>
  );
}
