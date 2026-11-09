"use client";

import { useState, type ReactNode } from "react";
import type { PreviewOther } from "@/lib/panel-ad-previews";

// Cómo se ve el anuncio. Celular: 390 × 844 px. Computadora y tablet: imagen horizontal de
// 1280 × 720 px. Con flechas se cambia entre los anuncios, como en la web.
// Si falta la imagen de escritorio, se usa la de celular y se avisa.
export function AdPreview({ imageUrl, desktopImageUrl, title, destination, others = [] }: {
  imageUrl: string | null;
  desktopImageUrl: string | null;
  title: string;
  destination: string;
  others?: PreviewOther[];
}) {
  const [index, setIndex] = useState(0);
  const items: PreviewOther[] = [{ title, imageUrl, desktopImageUrl }, ...others];
  const count = items.length;
  const current = items[Math.min(index, count - 1)];
  const isEdited = index === 0;
  const go = (step: number) => setIndex((value) => (value + step + count) % count);

  return (
    <div className="ad-preview-set">
      <AdFrame label="Celular (390 × 844)" className="ad-frame-mobile">
        <AdCard imageUrl={current.imageUrl} title={current.title} />
      </AdFrame>
      <AdFrame label="Computadora y tablet (1280 × 720)" className="ad-frame-laptop">
        <AdCard imageUrl={current.desktopImageUrl ?? current.imageUrl} title={current.title} />
        {count > 1 && (
          <>
            <button type="button" className="ad-preview-nav ad-preview-prev"
              aria-label="Anuncio anterior" onClick={() => go(-1)}>‹</button>
            <button type="button" className="ad-preview-nav ad-preview-next"
              aria-label="Anuncio siguiente" onClick={() => go(1)}>›</button>
          </>
        )}
      </AdFrame>
      {count > 1 && (
        <p className="muted">Anuncio {Math.min(index, count - 1) + 1} de {count}</p>
      )}
      {isEdited && !desktopImageUrl && (
        <div className="callout warning" role="status">
          <strong>Falta la imagen de computadora y tablet</strong>
          <span>Súbela en el campo «Computadora y tablet». Mientras tanto se muestra la de celular.</span>
        </div>
      )}
      <p className="muted">
        {current.title || "Título del anuncio"}
        {isEdited ? ` · Lleva a: ${destination || "elige la promoción"}` : ""}
      </p>
    </div>
  );
}

function AdFrame({ label, className, children }: {
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <figure className={`ad-frame ${className}`}>
      <figcaption>{label}</figcaption>
      <div className="ad-frame-screen">{children}</div>
    </figure>
  );
}

function AdCard({ imageUrl, title }: { imageUrl: string | null; title: string }) {
  return (
    <div className="ad-card">
      {imageUrl
        ? <img src={imageUrl} alt={title} className="ad-card-image" />
        : <div className="ad-card-image ad-card-empty">Elige una imagen</div>}
      <span className="ad-card-close" aria-hidden="true">×</span>
      <span className="ad-card-button">Descubrir</span>
    </div>
  );
}
