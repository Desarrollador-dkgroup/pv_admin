"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createAdAction } from "@/app/panel/anuncios/actions";
import { Button, Panel } from "@/components/ui";

export type AdPromotionOption = { id: string; label: string };

export type AdRecord = {
  id: string;
  title: string;
  imageUrl: string;
  service_promotion_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

// Formulario de anuncio (crear o editar) con la maqueta de cómo se verá en la web.
export function AdForm({ promotions, ad }: { promotions: AdPromotionOption[]; ad?: AdRecord }) {
  const [state, action, pending] = useActionState(createAdAction, { error: "" });
  const [preview, setPreview] = useState<string | null>(ad?.imageUrl ?? null);

  return (
    <form action={action}>
      {ad && <input type="hidden" name="ad_id" value={ad.id} />}
      <div className="split wide-side">
        <Panel>
          <h2>Anuncio</h2>
          <label className="field">
            Título (uso interno)
            <input name="title" required maxLength={120} defaultValue={ad?.title} />
          </label>
          <label className="field dropzone">
            {ad ? "Cambiar imagen (opcional)" : "Imagen"}
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required={!ad}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }} />
            <small className="muted">JPG, PNG o WEBP, máximo 5 MB.</small>
          </label>
          <label className="field">
            Promoción a la que lleva el botón «Descubrir»
            <select name="service_promotion_id" defaultValue={ad?.service_promotion_id ?? ""}>
              <option value="">Sin promoción (solo se cierra)</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>{promotion.label}</option>
              ))}
            </select>
            <small className="muted">Si eliges «Sin promoción», el botón solo cierra el anuncio.</small>
          </label>
          <div className="form-row">
            <label className="field">
              Mostrar desde (opcional)
              <input type="date" name="starts_on" defaultValue={ad?.starts_on ?? ""} />
            </label>
            <label className="field">
              Mostrar hasta (opcional)
              <input type="date" name="ends_on" defaultValue={ad?.ends_on ?? ""} />
            </label>
          </div>
          <label className="checkbox-option">
            <input type="checkbox" name="is_active" defaultChecked={ad ? ad.is_active : true} />
            Anuncio activo
          </label>
        </Panel>
        <Panel>
          <h2>Así se verá</h2>
          <p className="muted">Ventana emergente al abrir la web.</p>
          <div className="ad-mockup">
            {preview
              ? <img src={preview} alt="" />
              : <div className="ad-mockup-empty">Elige una imagen</div>}
            <div className="actions end">
              <span className="button quiet small">Cerrar</span>
              <span className="button primary small">Descubrir</span>
            </div>
          </div>
        </Panel>
      </div>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <footer className="sticky-actions">
        <span className="muted">
          {ad ? "Los cambios se ven en la web al guardar." : "El anuncio aparece al final de la lista."}
        </span>
        <Link className="button quiet" href="/panel/anuncios">Cancelar</Link>
        <Button type="submit" tone="primary" disabled={pending}>
          {pending ? "Guardando..." : "Guardar anuncio"}
        </Button>
      </footer>
    </form>
  );
}
