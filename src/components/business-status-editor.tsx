"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

// Edita si el negocio está activo. Al guardar vuelve a la vista de lectura.
export function BusinessStatusEditor({
  businessId,
  isActive,
  action,
}: {
  businessId: string;
  isActive: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="button secondary small" onClick={() => setOpen(true)}>
        Editar
      </button>
    );
  }

  return (
    <form action={action} className="stack compact" onSubmit={() => setOpen(false)}>
      <input type="hidden" name="business_id" value={businessId} />
      <label className="checkbox-option">
        <input type="checkbox" name="is_active" defaultChecked={isActive} />
        Negocio activo
      </label>
      <small className="muted">Si lo desactivas, sus servicios dejan de verse en la web.</small>
      <Button tone="secondary" type="submit">Guardar estado</Button>
    </form>
  );
}
