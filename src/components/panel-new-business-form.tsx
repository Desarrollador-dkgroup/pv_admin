"use client";

import { useActionState } from "react";
import { createBusinessAction } from "@/app/panel/negocios/actions";

// Alta de un negocio nuevo. El propietario se asigna después, desde la ficha del negocio.
export function NewBusinessForm() {
  const [state, action, pending] = useActionState(createBusinessAction, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        Nombre del negocio
        <input name="name" required minLength={2} maxLength={80} />
        <small className="muted">
          Después de crearlo, asigna su propietario desde «Personas» en la ficha del negocio.
        </small>
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Creando…" : "Crear negocio"}
      </button>
    </form>
  );
}
