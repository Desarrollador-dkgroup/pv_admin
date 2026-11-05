"use client";

import { useActionState } from "react";
import {
  deleteOwnerAccountAction,
  reactivateOwnerAction,
  suspendOwnerAction,
} from "@/app/panel/propietarios/actions";
import { ConfirmSubmit } from "@/components/ui";

// Acciones de una cuenta de propietario: suspender o reactivar y borrar, con confirmación.
export function OwnerActions({
  userId,
  name,
  suspended,
}: {
  userId: string;
  name: string;
  suspended: boolean;
}) {
  // Si el borrado falla, el motivo se muestra aquí en vez de romper la página.
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteOwnerAccountAction,
    { error: "" },
  );
  const confirmText = suspended
    ? `¿Reactivar el acceso de ${name}?`
    : `¿Suspender a ${name}? Perderá el acceso al panel.`;

  return (
    <div className="owner-actions">
      {(
        <div className="actions">
          <form action={suspended ? reactivateOwnerAction : suspendOwnerAction}>
            <input type="hidden" name="user_id" value={userId} />
            <ConfirmSubmit tone="secondary" confirm={{
              title: confirmText,
              confirmLabel: suspended ? "Reactivar" : "Suspender",
              danger: !suspended,
            }}>
              {suspended ? "Reactivar" : "Suspender"}
            </ConfirmSubmit>
          </form>
          <form action={deleteAction}>
            <input type="hidden" name="user_id" value={userId} />
            <ConfirmSubmit tone="danger" disabled={deleting} confirm={{
              title: `¿Borrar la cuenta de ${name}?`,
              body: "Se elimina su acceso y su perfil. No se puede deshacer.",
              confirmLabel: "Borrar cuenta",
              danger: true,
            }}>
              {deleting ? "Borrando..." : "Borrar cuenta"}
            </ConfirmSubmit>
          </form>
          {deleteState.error && (
            <p role="alert" className="form-error">{deleteState.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
