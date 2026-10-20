"use client";

import { useActionState } from "react";
import { updateOwnBusinessAction } from "@/app/panel/negocios/actions";

type Option = { id: string; name: string | null };

// Datos del negocio que el propietario define desde su propia cuenta.
export function OwnBusinessForm({
  businessId,
  name,
  description,
  cityId,
  cities,
}: {
  businessId: string;
  name: string;
  description: string;
  cityId: string | null;
  cities: Option[];
}) {
  const [state, action, pending] = useActionState(updateOwnBusinessAction, { error: "" });

  return (
    <form action={action} className="owner-business-edit">
      <input type="hidden" name="business_id" value={businessId} />
      <label className="field">
        Nombre del negocio
        <input name="name" required minLength={2} maxLength={80} defaultValue={name} />
      </label>
      <label className="field">
        Ciudad
        <select className="picker" name="city_id" required defaultValue={cityId ?? ""}>
          <option value="" disabled>Selecciona una ciudad</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>{city.name ?? city.id}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Descripción
        <textarea
          name="description"
          rows={4}
          maxLength={1200}
          defaultValue={description}
          placeholder="Cuenta qué ofrece tu negocio a los visitantes."
        />
      </label>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <button type="submit" className="button primary" disabled={pending}>
        {pending ? "Guardando…" : "Guardar datos del negocio"}
      </button>
    </form>
  );
}
