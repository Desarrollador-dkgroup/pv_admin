"use client";

import { Badge, Button, Modal } from "@/components/ui";
import { usePreview } from "./context";

// Simula la habilitación sin crear usuarios reales ni guardar la contraseña temporal.
export function InviteModal({ onClose }: { onClose: () => void }) {
  const { data, save, notify } = usePreview();
  return (
    <Modal title="Dar acceso a un propietario" onClose={onClose}>
      <p>El propietario ingresará con correo y contraseña temporal.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          const email = String(fields.get("email")).trim().toLowerCase();
          if (
            data.entities.some(
              (entity) => entity.kind === "owners" && entity.fields.email?.toLowerCase() === email,
            )
          ) {
            notify("Ese correo ya está en la vista previa.");
            return;
          }
          save(
            {
              id: crypto.randomUUID(),
              kind: "owners",
              name: String(fields.get("name")),
              fields: { email },
              business: String(fields.get("business")),
              status: "Invitación enviada",
              category: "",
              sites: [],
              photos: [],
            },
            "Acceso de prueba creado; no se envió correo",
          );
          onClose();
        }}
      >
        <label className="field">
          Nombre
          <input name="name" required />
        </label>
        <label className="field">
          Correo electrónico
          <input name="email" type="email" required />
        </label>
        <label className="field">
          Negocio asignado
          <select name="business" required>
            {data.entities
              .filter((entity) => entity.kind === "businesses")
              .map((entity) => (
                <option key={entity.id}>{entity.name}</option>
              ))}
          </select>
        </label>
        <label className="field">
          Contraseña temporal
          <input
            name="temporary"
            type="password"
            minLength={12}
            autoComplete="new-password"
            required
          />
        </label>
        <Badge>Cambio de contraseña obligatorio en el primer ingreso</Badge>
        <p className="muted small">Prueba visual: no uses una contraseña real.</p>
        <div className="actions">
          <Button tone="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Crear acceso de prueba</Button>
        </div>
      </form>
    </Modal>
  );
}
