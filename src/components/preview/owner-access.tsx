"use client";

import { useState } from "react";
import { Badge, Button, Modal, Panel } from "@/components/ui";
import type { PreviewEntity } from "@/types/preview";
import { usePreview } from "./context";

// Separa suspensión de acceso y publicación del negocio en el recorrido administrativo.
export function OwnerAccess({ record }: { record: PreviewEntity }) {
  const { save, notify } = usePreview();
  const [confirm, setConfirm] = useState(false);
  const suspended = record.status === "Suspendido";
  return (
    <>
      <Panel>
        <h2>{record.name}</h2>
        <p>{record.fields.email}</p>
        <Badge>{record.status}</Badge>
        <label className="field">
          Negocio asignado
          <input value={record.business} readOnly />
        </label>
      </Panel>
      <aside className="notice">
        <b>Acceso y publicación son acciones independientes</b>
        <small>Suspender la cuenta no oculta automáticamente sus servicios.</small>
      </aside>
      <div className="actions">
        <Button
          tone="secondary"
          onClick={() => notify("Restablecimiento simulado. No se envió ningún correo.")}
        >
          Restablecer contraseña
        </Button>
        <Button onClick={() => setConfirm(true)}>
          {suspended ? "Reactivar acceso" : "Suspender acceso"}
        </Button>
      </div>
      {confirm && (
        <Modal
          title={suspended ? "¿Reactivar este acceso?" : "¿Suspender este acceso?"}
          onClose={() => setConfirm(false)}
        >
          <p>Los servicios publicados no se modificarán.</p>
          <div className="actions">
            <Button tone="secondary" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                save(
                  { ...record, status: suspended ? "Activo" : "Suspendido" },
                  suspended ? "Acceso reactivado" : "Acceso suspendido",
                );
                setConfirm(false);
              }}
            >
              Confirmar cambio de prueba
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
