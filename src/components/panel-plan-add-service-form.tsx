"use client";

import { addPlanServiceAction } from "@/app/panel/negocios/actions";
import { ConfirmSubmit } from "@/components/ui";

// Suma un servicio al plan de una categoría. Si la categoría tiene tipos (hospedaje), pide el tipo.
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
  return (
    <form action={addPlanServiceAction} className="actions">
      <input type="hidden" name="business_id" value={businessId} />
      <input type="hidden" name="category_id" value={categoryId} />
      {types.length > 0 && (
        <select name="hospedaje_type_id" required defaultValue="" aria-label="Tipo de hospedaje">
          <option value="" disabled>Elige el tipo</option>
          {types.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      )}
      <ConfirmSubmit tone="secondary" className="small" confirm={{
        title: `¿Agregar un servicio de ${categoryLabel}?`,
        body: "El plan del negocio aumenta en 1. El propietario podrá crear ese servicio desde su cuenta.",
        confirmLabel: "Sí, agregar",
      }}>
        + Agregar nuevo servicio
      </ConfirmSubmit>
    </form>
  );
}
