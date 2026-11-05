"use client";

import { useActionState } from "react";
import { updateOwnNameAction } from "@/app/panel/cuenta/actions";
import { Button } from "@/components/ui";

// Nombre visible de la propia cuenta.
export function OwnNameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateOwnNameAction, { error: "" });
  return (
    <form action={action} className="stack compact">
      <label className="field">
        Nombre
        <input name="display_name" defaultValue={name} required minLength={2} maxLength={80} />
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      {state.saved && <p className="form-success" role="status">Nombre guardado.</p>}
      <Button tone="secondary" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar nombre"}
      </Button>
    </form>
  );
}
