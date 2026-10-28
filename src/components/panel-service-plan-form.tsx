"use client";

import { useState, useActionState } from "react";
import { addServicePlanAction } from "@/app/panel/negocios/actions";
import { Button } from "@/components/ui";

type Category = { id: string; label: string | null };
type LodgingType = { id: string; label: string | null };

const HOSPEDAJE = "hospedaje";
const MAX_COUNT = 50;

// Botones − y + para elegir cuántos servicios de un tipo tiene el negocio.
function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Quitar uno"
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_COUNT, value + 1))}
        disabled={value >= MAX_COUNT}
        aria-label="Añadir uno"
      >
        +
      </button>
    </div>
  );
}

// Formulario para agregar un nuevo servicio al plan del negocio.
export function ServicePlanAddForm({
  businessId,
  categories,
  lodgingTypes,
}: {
  businessId: string;
  categories: Category[];
  lodgingTypes: LodgingType[];
}) {
  const [state, action, pending] = useActionState(addServicePlanAction, { error: "" });
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [typeId, setTypeId] = useState(lodgingTypes[0]?.id ?? "");

  const handleCategoryChange = (newCategoryId: string) => {
    setCategoryId(newCategoryId);
    if (newCategoryId === HOSPEDAJE && !typeId) {
      setTypeId(lodgingTypes[0]?.id ?? "");
    }
  };

  return (
    <form action={action} className="service-plan-form">
      <input type="hidden" name="business_id" value={businessId} />
      <div className="form-row">
        <label className="field">
          Categoría
          <select
            name="category_id"
            value={categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            required
          >
            <option value="" disabled>Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label ?? category.id}
              </option>
            ))}
          </select>
        </label>
        {categoryId === HOSPEDAJE && (
          <label className="field">
            Tipo de hospedaje
            <select
              name="hospedaje_type_id"
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              required
            >
              {lodgingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label ?? type.id}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="field service-plan-quantity">
        Cantidad
        <Stepper value={quantity} onChange={setQuantity} />
        <input type="hidden" name="quantity" value={quantity} />
      </div>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <Button type="submit" tone="secondary" disabled={pending || !categoryId}>
        {pending ? "Agregando…" : "Agregar servicio al plan"}
      </Button>
    </form>
  );
}
