import type { ReactNode } from "react";

// Cómo se ve el anuncio en el celular: un teléfono estándar de 390 × 844 px.
export function AdPreview({ imageUrl, title, destination }: {
  imageUrl: string | null;
  title: string;
  destination: string;
}) {
  return (
    <div className="ad-preview-set">
      <AdFrame label="Celular (390 × 844)">
        <AdCard imageUrl={imageUrl} title={title} />
      </AdFrame>
      <p className="muted">
        {title || "Título del anuncio"} · Lleva a: {destination || "elige la promoción"}
      </p>
    </div>
  );
}

function AdFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="ad-frame ad-frame-mobile">
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
