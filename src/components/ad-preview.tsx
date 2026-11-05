import type { ReactNode } from "react";

// Cómo se ve el anuncio en la web: en escritorio es una ventana centrada; en el celular ocupa el
// ancho de la pantalla. Se muestran las dos vistas para revisar ambas.
export function AdPreview({ imageUrl, title, destination }: {
  imageUrl: string | null;
  title: string;
  destination: string;
}) {
  return (
    <div className="ad-preview-set">
      <AdFrame label="Escritorio" className="ad-frame-desktop">
        <AdCard imageUrl={imageUrl} title={title} />
      </AdFrame>
      <AdFrame label="Celular" className="ad-frame-mobile">
        <AdCard imageUrl={imageUrl} title={title} />
      </AdFrame>
      <p className="muted">
        {title || "Título del anuncio"} · Lleva a: {destination || "elige la promoción"}
      </p>
    </div>
  );
}

function AdFrame({ label, className, children }: { label: string; className: string; children: ReactNode }) {
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
