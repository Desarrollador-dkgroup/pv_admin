"use client";

import { useRef, useState, type PointerEvent } from "react";
import { PhotoPlaceholder } from "@/components/public-service/ui";
import styles from "./service.module.css";

// Galería deslizable de la ficha (src/components/service-detail/photo-gallery.tsx).
export function PhotoGallery({ photos, indicator = "dots", className = "" }: {
  photos: string[];
  indicator?: "dots" | "counter";
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; left: number } | null>(null);

  // Va a una foto concreta; la de escritorio y los puntos usan la misma función.
  const goTo = (index: number) => {
    const element = track.current;
    if (!element) return;
    element.scrollTo({ left: index * element.clientWidth, behavior: "smooth" });
  };

  // Con ratón, arrastrar la foto la cambia (en móvil lo hace el deslizamiento nativo).
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || !track.current) return;
    drag.current = { x: event.clientX, left: track.current.scrollLeft };
    track.current.setPointerCapture(event.pointerId);
    track.current.style.scrollSnapType = "none";
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !track.current) return;
    track.current.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
  };
  const endDrag = () => {
    const element = track.current;
    if (!drag.current || !element) return;
    drag.current = null;
    element.style.scrollSnapType = "";
    goTo(Math.round(element.scrollLeft / element.clientWidth));
  };

  if (photos.length === 0) return <PhotoPlaceholder className={`${styles.gallery} ${className}`} />;

  return (
    <div className={`${styles.gallery} ${className}`}>
      <div
        ref={track}
        className={`${styles.galleryTrack} no-scrollbar`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onScroll={(event) => {
          const element = event.currentTarget;
          setActive(Math.round(element.scrollLeft / element.clientWidth));
        }}
      >
        {photos.map((photo, index) => (
          <img key={photo} src={photo} alt="" className={styles.galleryImage}
            loading={index === 0 ? "eager" : "lazy"} draggable={false} />
        ))}
      </div>
      {photos.length > 1 && indicator === "counter" && (
        <span className={styles.counter}>{active + 1}/{photos.length}</span>
      )}
      {photos.length > 1 && (
        <>
          <button type="button" aria-label="Foto anterior"
            className={`${styles.arrow} ${styles.arrowPrev}`} disabled={active === 0}
            onClick={() => goTo(Math.max(0, active - 1))}>‹</button>
          <button type="button" aria-label="Foto siguiente"
            className={`${styles.arrow} ${styles.arrowNext}`} disabled={active >= photos.length - 1}
            onClick={() => goTo(Math.min(photos.length - 1, active + 1))}>›</button>
        </>
      )}
      {photos.length > 1 && indicator === "dots" && (
        <div className={styles.dots}>
          {photos.map((photo, index) => (
            <button
              key={photo}
              type="button"
              aria-label={`Foto ${index + 1}`}
              className={`${styles.dot} ${index === active ? styles.dotActive : ""}`}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
