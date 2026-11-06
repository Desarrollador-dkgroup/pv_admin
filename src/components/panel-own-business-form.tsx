"use client";

import { useActionState } from "react";
import { updateOwnBusinessAction } from "@/app/panel/negocios/actions";

// Datos del negocio que el propietario define desde su propia cuenta.
export function OwnBusinessForm({
  businessId,
  name,
}: {
  businessId: string;
  name: string;
}) {
  const [state, action, pending] = useActionState(updateOwnBusinessAction, { error: "" });

  return (
    <form action={action} className="owner-business-edit">
      <input type="hidden" name="business_id" value={businessId} />
      <label className="field">
        Nombre del negocio
        <input name="name" required minLength={2} maxLength={80} defaultValue={name} />
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos del negocio"}
      </button>
    </form>
  );
}
