"use client";

import { useActionState } from "react";
import { updatePersonNameAction } from "@/app/panel/permisos/actions";
import { Button } from "@/components/ui";

// Campo para cambiar el nombre visible de una cuenta. El servidor valida el permiso.
export function PersonNameForm({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(updatePersonNameAction, { error: "" });

  return (
    <form action={action} className="inline-name-form">
      <input type="hidden" name="user_id" value={userId} />
      <input
        name="display_name"
        defaultValue={name}
        required
        minLength={2}
        maxLength={80}
        aria-label="Nombre de la persona"
      />
      <Button tone="secondary" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {state.error && <small role="alert" className="form-error">{state.error}</small>}
    </form>
  );
}
