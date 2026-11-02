"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createAdAction } from "@/app/panel/anuncios/actions";
import { Button, Panel } from "@/components/ui";

export type AdPromotionOption = { id: string; label: string };

// Formulario de anuncio: imagen, enlace opcional a una promoción y vigencia opcional.
export function AdForm({ promotions }: { promotions: AdPromotionOption[] }) {
  const [state, action, pending] = useActionState(createAdAction, { error: "" });

  return (
    <form action={action}>
      <Panel>
        <h2>Anuncio</h2>
        <label className="field">
          Título (uso interno)
          <input name="title" required maxLength={120} />
        </label>
        <label className="field">
          Imagen (JPG, PNG o WEBP, máximo 5 MB)
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <label className="field">
          Promoción a la que lleva el botón «Descubrir»
          <select name="service_promotion_id" defaultValue="">
            <option value="">Sin promoción (solo se cierra)</option>
            {promotions.map((promotion) => (
              <option key={promotion.id} value={promotion.id}>{promotion.label}</option>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label className="field">
            Mostrar desde (opcional)
            <input type="date" name="starts_on" />
          </label>
          <label className="field">
            Mostrar hasta (opcional)
            <input type="date" name="ends_on" />
          </label>
        </div>
        <label className="checkbox-option">
          <input type="checkbox" name="is_active" defaultChecked />
          Anuncio activo
        </label>
      </Panel>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <footer className="sticky-actions">
        <Link className="button quiet" href="/panel/anuncios">Cancelar</Link>
        <Button type="submit" tone="primary" disabled={pending}>
          {pending ? "Subiendo..." : "Guardar anuncio"}
        </Button>
      </footer>
    </form>
  );
}
