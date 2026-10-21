"use client";

import { useState } from "react";
import {
  deleteOwnerAccountAction,
  reactivateOwnerAction,
  suspendOwnerAction,
} from "@/app/panel/propietarios/actions";
import { Button } from "@/components/ui";

// Acciones de una cuenta de propietario: "Editar" despliega suspender o reactivar y borrar.
// Cada acción pide confirmación en el clic antes de enviarse.
export function OwnerActions({
  userId,
  name,
  suspended,
}: {
  userId: string;
  name: string;
  suspended: boolean;
}) {
  const [open, setOpen] = useState(false);
  const confirmText = suspended
    ? `¿Reactivar el acceso de ${name}?`
    : `¿Suspender a ${name}? Perderá el acceso al panel.`;

  return (
    <div className="owner-actions">
      <Button tone="secondary" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Cerrar" : "Editar"}
      </Button>
      {open && (
        <div className="actions" style={{ marginTop: 8 }}>
          <form action={suspended ? reactivateOwnerAction : suspendOwnerAction}>
            <input type="hidden" name="user_id" value={userId} />
            <Button
              tone="secondary"
              type="submit"
              onClick={(event) => {
                if (!window.confirm(confirmText)) event.preventDefault();
              }}
            >
              {suspended ? "Reactivar" : "Suspender"}
            </Button>
          </form>
          <form action={deleteOwnerAccountAction}>
            <input type="hidden" name="user_id" value={userId} />
            <Button
              tone="quiet"
              type="submit"
              onClick={(event) => {
                if (!window.confirm(`¿Borrar la cuenta de ${name}? No se puede deshacer.`)) {
                  event.preventDefault();
                }
              }}
            >
              Borrar cuenta
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
