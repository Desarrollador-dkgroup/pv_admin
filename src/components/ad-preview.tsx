import type { ReactNode } from "react";

// Cómo se ve el anuncio. Celular: 390 × 844 px. Computadora y tablet: la imagen de 780 × 1688 px
// en la misma tarjeta vertical, centrada en la página. Si falta la imagen de escritorio, se usa la
// de celular y se avisa.
export function AdPreview({ imageUrl, desktopImageUrl, title, destination }: {
  imageUrl: string | null;
  desktopImageUrl: string | null;
  title: string;
  destination: string;
}) {
  return (
    <div className="ad-preview-set">
      <AdFrame label="Celular (390 × 844)" className="ad-frame-mobile">
        <AdCard imageUrl={imageUrl} title={title} />
      </AdFrame>
      <AdFrame label="Computadora y tablet (780 × 1688)" className="ad-frame-laptop">
        <AdCard imageUrl={desktopImageUrl ?? imageUrl} title={title} />
      </AdFrame>
      {!desktopImageUrl && (
        <div className="callout warning" role="status">
          <strong>Falta la imagen de computadora y tablet</strong>
          <span>Súbela en el campo «Computadora y tablet». Mientras tanto se muestra la de celular.</span>
        </div>
      )}
      <p className="muted">
        {title || "Título del anuncio"} · Lleva a: {destination || "elige la promoción"}
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
