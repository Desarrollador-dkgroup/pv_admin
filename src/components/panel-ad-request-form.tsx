"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { requestAdAction } from "@/app/panel/anuncios/solicitudes-actions";
import { AdPreview } from "@/components/ad-preview";
import { Button, Panel } from "@/components/ui";

export type OwnerPromotionOption = { id: string; label: string; destination: string };

// Solicitud de anuncio del propietario: el equipo la revisa y después la gestiona.
export function AdRequestForm({ businessId, promotions }: {
  businessId: string;
  promotions: OwnerPromotionOption[];
}) {
  const [state, action, pending] = useActionState(requestAdAction, { error: "" });
  const [title, setTitle] = useState("");
  const [promotionId, setPromotionId] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [desktopImageUrl, setDesktopImageUrl] = useState<string | null>(null);
  const destination = promotions.find((item) => item.id === promotionId)?.destination ?? "";

  if (state.saved) {
    return (
      <Panel>
        <h2>Solicitud enviada</h2>
        <p className="muted">
          El equipo la revisará y te avisará en Notificaciones. Puedes seguir su estado en Mis anuncios.
        </p>
        <Link className="button secondary" href="/panel/anuncios">Volver a anuncios</Link>
      </Panel>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="business_id" value={businessId} />
      <div className="split wide-side">
        <Panel>
          <h2>Datos del anuncio</h2>
          <label className="field">
            Título del anuncio
            <input name="title" required maxLength={120} value={title}
              onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="field dropzone">
            Imagen del anuncio
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" required
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setImageUrl(URL.createObjectURL(file));
              }} />
            <small className="muted">
              Para celular: JPG, PNG o WEBP, máximo 5 MB. Vertical, 390 × 844 px (o 780 × 1688).
            </small>
          </label>
          <label className="field dropzone">
            Imagen de computadora y tablet
            <input type="file" name="desktop_image" accept="image/jpeg,image/png,image/webp" required
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setDesktopImageUrl(URL.createObjectURL(file));
              }} />
            <small className="muted">
              Vertical, 780 × 1688 px, JPG, PNG o WEBP, máximo 5 MB.
            </small>
          </label>
          <label className="field">
            ¿A qué promoción lleva el anuncio?
            <select name="service_promotion_id" required value={promotionId}
              onChange={(event) => setPromotionId(event.target.value)}>
              <option value="">Elige una promoción</option>
              {promotions.map((promotion) => (
                <option key={promotion.id} value={promotion.id}>{promotion.label}</option>
              ))}
            </select>
            <small className="muted">
              {destination ? `El botón «Descubrir» llevará a: ${destination}.` : "Crea primero una promoción en Promociones."}
            </small>
          </label>
          <div className="form-row">
            <label className="field">
              Mostrar desde
              <input type="date" name="starts_on" />
            </label>
            <label className="field">
              Mostrar hasta
              <input type="date" name="ends_on" />
            </label>
          </div>
          <label className="field">
            Notas para el equipo (opcional)
            <textarea name="notes" rows={3} maxLength={600}
              placeholder="Ej. Preferimos que se muestre en la primera semana de junio." />
          </label>
        </Panel>
        <Panel>
          <h2>Así se verá</h2>
          <AdPreview imageUrl={imageUrl} desktopImageUrl={desktopImageUrl} title={title}
            destination={destination} />
        </Panel>
      </div>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <footer className="sticky-actions">
        <span className="muted">El equipo revisa la solicitud antes de publicar el anuncio.</span>
        <Link className="button quiet" href="/panel/anuncios">Cancelar</Link>
        <Button type="submit" tone="primary" disabled={pending || !promotions.length}>
          {pending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </footer>
    </form>
  );
}
