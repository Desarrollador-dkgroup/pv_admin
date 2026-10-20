"use client";

import { deleteOwnerAccountAction } from "@/app/panel/propietarios/actions";
import { Button } from "@/components/ui";

// Botón para borrar una cuenta de propietario; pide confirmación antes de enviar.
export function DeleteOwnerForm({ userId, name }: { userId: string; name: string }) {
  return (
    <form
      action={deleteOwnerAccountAction}
      onSubmit={(event) => {
        if (!window.confirm(`¿Borrar la cuenta de ${name}? No se puede deshacer.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <Button tone="quiet" type="submit">Borrar</Button>
    </form>
  );
}
