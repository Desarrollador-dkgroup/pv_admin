"use client";

import { useState } from "react";
import { addPlanServiceAction } from "@/app/panel/negocios/actions";
import { ConfirmSubmit } from "@/components/ui";

// Suma un servicio al plan de una categoría. Si la categoría tiene tipos (hospedaje), pide el tipo
// y el diálogo de confirmación muestra cuál se va a sumar.
export function PlanAddServiceForm({
  businessId,
  categoryId,
  categoryLabel,
  types,
}: {
  businessId: string;
  categoryId: string;
  categoryLabel: string;
  types: { id: string; label: string }[];
}) {
  const [typeId, setTypeId] = useState("");
  const typeLabel = types.find((item) => item.id === typeId)?.label;
  const target = typeLabel ? `${categoryLabel} · ${typeLabel}` : categoryLabel;

  return (
    <form action={addPlanServiceAction} className="actions">
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="category_id" value={categoryId} />
      {types.length > 0 && (
        <select name="hospedaje_type_id" required value={typeId}
          onChange={(event) => setTypeId(event.target.value)} aria-label="Tipo de hospedaje">
          <option value="" disabled>Elige el tipo</option>
          {types.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      )}
      <ConfirmSubmit tone="secondary" className="small" disabled={types.length > 0 && !typeId}
        confirm={{
          title: `¿Agregar un servicio de ${target}?`,
          body: `El propietario tendrá 1 servicio más disponible para crear en ${target}. Lo verá en «Mis servicios» y podrá enviarlo a revisión.`,
          confirmLabel: "Sí, agregar",
        }}>
        + Agregar nuevo servicio
      </ConfirmSubmit>
    </form>
  );
}
