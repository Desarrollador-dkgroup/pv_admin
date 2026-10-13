"use client";

import { useState } from "react";
import { Badge, Button, Modal, Panel } from "@/components/ui";
import { resetPreview } from "@/lib/preview-store";
import { usePreview } from "./context";

// Muestra la cuenta ilustrativa y permite restaurar los ejemplos del prototipo.
export function Account() {
  const { role, notify } = usePreview();
  const [modal, setModal] = useState<"password" | "reset" | null>(null);
  const [error, setError] = useState("");
  return (
    <>
      <Panel>
        <label className="field">
          Nombre
          <input readOnly value={role === "admin" ? "Equipo Panamá Viajero" : "María López"} />
        </label>
        <label className="field">
          Correo
          <input readOnly value={role === "admin" ? "admin@ejemplo.com" : "maria@ejemplo.com"} />
        </label>
        <Badge>{role === "admin" ? "Administrador" : "Propietaria"}</Badge>
      </Panel>
      <div className="actions">
        <Button tone="secondary" onClick={() => setModal("password")}>
          Cambiar contraseña
        </Button>
        <Button tone="quiet" onClick={() => setModal("reset")}>
          Restablecer ejemplos de la vista previa
        </Button>
      </div>
      {modal === "password" && (
        <Modal
          title="Cambiar contraseña de prueba"
          onClose={() => {
            setModal(null);
            setError("");
          }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              if (values.get("new") !== values.get("confirm")) {
                setError("Las contraseñas no coinciden.");
                return;
              }
              setModal(null);
              setError("");
              notify("Cambio de contraseña simulado. No se modificó ninguna cuenta real.");
            }}
          >
            <label className="field">
              Contraseña actual
              <input type="password" required autoComplete="current-password" />
            </label>
            <label className="field">
              Nueva contraseña
              <input
                name="new"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </label>
            <label className="field">
              Confirmar contraseña
              <input
                name="confirm"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <Button type="submit">Guardar contraseña de prueba</Button>
          </form>
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="¿Restablecer los ejemplos?" onClose={() => setModal(null)}>
          <p>
            Se retirarán los cambios locales, fotografías y registros de prueba de este navegador.
          </p>
          <div className="actions">
            <Button tone="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                resetPreview();
                setModal(null);
                notify("Los ejemplos se restauraron.");
              }}
            >
              Restablecer
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
