"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createAdAction } from "@/app/panel/anuncios/actions";
import { AdPreview } from "@/components/ad-preview";
import { Button, Panel } from "@/components/ui";
import type { PreviewOther } from "@/lib/panel-ad-previews";
import { setInputFile, shrinkImage } from "@/lib/image-shrink";

export type AdPromotionOption = { id: string; label: string; destination: string };

export type AdRecord = {
  id: string;
  title: string;
  imageUrl: string;
  desktopImageUrl: string | null;
  service_promotion_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
};

// Datos que llegan de una solicitud del propietario para crear el anuncio sin volver a escribirlos.
export type AdRequestPrefill = {
  id: string;
  title: string;
  imageUrl: string;
  desktopImageUrl: string | null;
  service_promotion_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
};

// Formulario de anuncio (crear o editar) con la maqueta de escritorio y celular.
export function AdForm({ promotions, ad, request, others = [] }: {
  promotions: AdPromotionOption[];
  ad?: AdRecord;
  request?: AdRequestPrefill;
  others?: PreviewOther[];
}) {
  const [state, action, pending] = useActionState(createAdAction, { error: "" });
  const initial = ad ?? request;
  const [title, setTitle] = useState(initial?.title ?? "");
  const [promotionId, setPromotionId] = useState(initial?.service_promotion_id ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null);
  const [desktopImageUrl, setDesktopImageUrl] = useState<string | null>(
    initial?.desktopImageUrl ?? null);
  const destination = promotions.find((item) => item.id === promotionId)?.destination ?? "";

  return (
    <form action={action}>
      {ad && <input type="hidden" name="ad_id" value={ad.id} />}
      {request && <input type="hidden" name="ad_request_id" value={request.id} />}
      <div className="split wide-side">
        <Panel>
          <h2>Anuncio</h2>
          {request && (
            <p className="muted">
              Solicitud del propietario. La imagen de la solicitud se usa si no subes otra.
            </p>
          )}
          <label className="field">
            Título (uso interno)
            <input name="title" required maxLength={120} value={title}
              onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field dropzone">
            {ad || request ? "Cambiar imagen (opcional)" : "Imagen"}
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp"
              required={!ad && !request}
onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                const small = await shrinkImage(file, 780, 1688);
                if (small !== file) setInputFile(input, small);
                setImageUrl(URL.createObjectURL(small));
              }} />
            <small className="muted">
              Para celular, vertical (recomendado 390 × 844 px). Puedes subir la foto original: se optimiza sola.
            </small>
          </label>
          <label className="field dropzone">
            {ad || request ? "Cambiar imagen de computadora y tablet (opcional)" : "Imagen de computadora y tablet"}
            <input type="file" name="desktop_image" accept="image/jpeg,image/png,image/webp"
              required={!ad && !request}
onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                const small = await shrinkImage(file, 1280, 720);
                if (small !== file) setInputFile(input, small);
                setDesktopImageUrl(URL.createObjectURL(small));
              }} />
            <small className="muted">
              Para computadora y tablet, horizontal (recomendado 1280 × 720 px). Puedes subir la foto original: se optimiza sola.
            </small>
          </label>
          <label className="field">
            Promoción a la que lleva el anuncio
            <select name="service_promotion_id" value={promotionId}
              onChange={(event) => setPromotionId(event.target.value)}>
              <option value="">Sin promoción (solo se cierra)</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>{promotion.label}</option>
              ))}
            </select>
            <small className="muted">
              {destination
                ? `El botón «Descubrir» lleva a: ${destination}.`
                : "Si no eliges promoción, el botón solo cierra el anuncio."}
            </small>
          </label>
          <div className="form-row">
            <label className="field">
              Mostrar desde (opcional)
              <input type="date" name="starts_on" defaultValue={initial?.starts_on ?? ""} />
            </label>
            <label className="field">
              Mostrar hasta (opcional)
              <input type="date" name="ends_on" defaultValue={initial?.ends_on ?? ""} />
            </label>
          </div>
          <label className="checkbox-option">
            <input type="checkbox" name="is_active" defaultChecked={ad ? ad.is_active : true} />
            Anuncio activo
          </label>
        </Panel>
        <Panel>
          <h2>Así se verá</h2>
          <p className="muted">En escritorio aparece en el centro de la página; en el celular ocupa la pantalla.</p>
          <AdPreview imageUrl={imageUrl} desktopImageUrl={desktopImageUrl} title={title}
            destination={destination} others={others} />
        </Panel>
      </div>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <footer className="sticky-actions">
        <span className="muted">
          {ad ? "Los cambios se ven en la web al guardar." : "El anuncio aparece al final de la lista."}
        </span>
        <Link className="button quiet" href="/panel/anuncios">Cancelar</Link>
        <Button type="submit" tone="primary" disabled={pending}>
          {pending ? "Publicando..." : ad ? "Guardar cambios" : "Publicar anuncio"}
        </Button>
      </footer>
    </form>
  );
}
