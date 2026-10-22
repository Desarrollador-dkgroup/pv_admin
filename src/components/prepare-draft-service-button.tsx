"use client";

import { useActionState } from "react";
import { prepareDraftServiceAction } from "@/app/panel/servicios/actions";

// Botón para que el propietario prepare una ficha borrador de un cupo libre de su plan.
// La función de la base vuelve a comprobar membresía, suspensión y cupo antes de crearla.
export function PrepareDraftServiceButton({
  businessId,
  categoryId,
  hospedajeTypeId,
  label,
}: {
  businessId: string;
  categoryId: string;
  hospedajeTypeId: string | null;
  label: string;
}) {
  const [state, action, pending] = useActionState(prepareDraftServiceAction, { error: "" });

  return (
    <form action={action} className="prepare-draft-form">
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="category_id" value={categoryId} />
      <input type="hidden" name="hospedaje_type_id" value={hospedajeTypeId ?? ""} />
      <button type="submit" className="button secondary" disabled={pending}>
        {pending ? "Preparando…" : label}
      </button>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
    </form>
  );
}
