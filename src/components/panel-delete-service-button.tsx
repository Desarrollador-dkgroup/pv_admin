"use client";

import { deleteOwnServiceAction } from "@/app/panel/actions";

// Botón para eliminar un servicio del propietario; pide confirmación antes de enviar.
export function DeleteServiceButton({ serviceId, name }: { serviceId: string; name: string }) {
  return (
    <form action={deleteOwnServiceAction} style={{ display: "inline" }}>
      <input type="hidden" name="service_id" value={serviceId} />
      <button
        className="button secondary"
        type="submit"
        onClick={(event) => {
          if (!window.confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) {
            event.preventDefault();
          }
        }}
      >
        Eliminar
      </button>
    </form>
  );
}
