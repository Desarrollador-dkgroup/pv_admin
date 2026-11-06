"use client";

import { useActionState } from "react";
import { addOwnerBusinessAction } from "@/app/panel/negocios/actions";
import { ConfirmSubmit } from "@/components/ui";

type Option = { id: string; label: string };

// Agrega otro negocio a un propietario y amplía su plan. Pide confirmación (sí o no) antes.
export function AddOwnerBusinessForm({
  owners,
  categories,
  lodgingTypes,
}: {
  owners: Option[];
  categories: Option[];
  lodgingTypes: Option[];
}) {
  const [state, action, pending] = useActionState(addOwnerBusinessAction, { error: "" });
  return (
    <form action={action} className="stack">
      <label className="field">
        Propietario
        <select name="owner_id" required defaultValue="">
          <option value="" disabled>Selecciona una cuenta</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>{owner.label}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Nombre del negocio nuevo
        <input name="name" required minLength={2} maxLength={80} />
      </label>
      <fieldset className="stack compact">
        <legend>Plan del negocio nuevo</legend>
        <p className="muted">Cuántos servicios de cada tipo puede crear. Puede ser 0.</p>
        <div className="form-grid">
          {categories.filter((item) => item.id !== "hospedaje").map((item) => (
            <label className="field" key={item.id}>
              {item.label}
              <input type="number" name={`cat__${item.id}`} min="0" max="20" defaultValue="0" />
            </label>
          ))}
          {lodgingTypes.map((item) => (
            <label className="field" key={item.id}>
              Hospedaje · {item.label}
              <input type="number" name={`type__${item.id}`} min="0" max="20" defaultValue="0" />
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      {state.saved && (
        <p className="form-success" role="status">
          Negocio agregado. Ya aparece en la cuenta del propietario.
        </p>
      )}
      <ConfirmSubmit tone="primary" disabled={pending}
        confirm={{
          title: "¿Agregar otro negocio a este propietario?",
          body: "Se crea un negocio nuevo con el plan elegido. Así se amplía el plan del propietario. ¿Confirmas?",
          confirmLabel: "Sí, agregar negocio",
        }}>
        {pending ? "Agregando…" : "Agregar negocio"}
      </ConfirmSubmit>
    </form>
  );
}
