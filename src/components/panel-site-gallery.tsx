"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { type GalleryAction, SiteGalleryItem } from "@/components/panel-site-gallery-item";
import {
  SITE_GALLERY_MAX, SITE_IMAGE_TYPES, moveListItem, sitePhotoFileError,
} from "@/lib/panel-sites";
import { uploadSitePhotos } from "@/lib/site-photo-upload";

const photoCount = (count: number) => (count === 1 ? "1 foto" : `${count} fotos`);

// Galería de un sitio: subir varias fotos, ordenarlas, elegir la portada y quitarlas.
// Cada foto viaja al servidor como un campo oculto `photos`, en el orden de la lista.
export function SiteGallery({
  initialPhotos,
  ensureSiteId,
  onBusyChange,
}: {
  initialPhotos: string[];
  ensureSiteId: () => string;
  onBusyChange: (busy: boolean) => void;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const headingId = useId();
  const hintId = useId();
  const addId = useId();
  const room = SITE_GALLERY_MAX - photos.length;

  function setBusyState(value: boolean) {
    setBusy(value);
    onBusyChange(value);
  }

  // Tras reordenar o quitar, el foco vuelve a la foto afectada para no perder la posición.
  function focusPhoto(index: number, action: GalleryAction) {
    requestAnimationFrame(() => {
      const item = list.current?.children[index];
      const preferred = item?.querySelector<HTMLButtonElement>(`[data-action="${action}"]:enabled`);
      const target = preferred ?? item?.querySelector<HTMLButtonElement>("button:enabled");
      (target ?? document.getElementById(addId))?.focus();
    });
  }

  function handleAction(action: GalleryAction, index: number) {
    const number = index + 1;
    if (action === "remove") {
      setPhotos(photos.filter((_, position) => position !== index));
      setAnnouncement(`Foto ${number} quitada. El cambio se guarda al guardar el sitio.`);
      focusPhoto(Math.min(index, photos.length - 2), "remove");
      return;
    }
    const target = action === "up" ? index - 1 : action === "down" ? index + 1 : 0;
    setPhotos(moveListItem(photos, index, target));
    setAnnouncement(
      action === "cover"
        ? `La foto ${number} es ahora la portada.`
        : `Foto ${number} movida a la posición ${target + 1}.`,
    );
    focusPhoto(target, action);
  }

  // Valida todos los archivos antes de subir y los sube a la carpeta del sitio, en orden.
  async function upload(files: FileList | null) {
    setError("");
    const selected = Array.from(files ?? []);
    if (fileInput.current) fileInput.current.value = "";
    if (selected.length === 0) return;
    if (selected.length > room) {
      setError(`Puedes añadir ${photoCount(room)} más. El máximo es ${SITE_GALLERY_MAX}.`);
      return;
    }
    const invalid = selected.map(sitePhotoFileError).find((message) => message !== null);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusyState(true);
    try {
      const result = await uploadSitePhotos(selected, ensureSiteId());
      setPhotos((current) => [...current, ...result.uploaded]);
      if (result.uploaded.length > 0) {
        setAnnouncement(`${photoCount(result.uploaded.length)} añadida(s).`);
      }
      setError(result.error);
    } finally {
      setBusyState(false);
    }
  }

  return (
    <section className="destination-block" aria-labelledby={headingId}>
      <h3 id={headingId}>Fotos del sitio</h3>
      <p className="muted" id={hintId}>
        La primera foto es la portada: la imagen grande del sitio y la de sus tarjetas. Tamaño
        recomendado 1920 × 1080 px (horizontal). JPG, PNG o WebP, hasta 10 MB cada una y{" "}
        {SITE_GALLERY_MAX} fotos por sitio.
      </p>
      {photos.map((photo) => <input key={photo} type="hidden" name="photos" value={photo} />)}
      {photos.length === 0 ? (
        <p className="site-gallery-empty">Este sitio aún no tiene fotos.</p>
      ) : (
        <ol ref={list} className="site-gallery" aria-label="Fotos del sitio, en el orden de la web">
          {photos.map((photo, index) => (
            <SiteGalleryItem
              key={photo}
              photo={photo}
              index={index}
              total={photos.length}
              disabled={busy}
              onAction={handleAction}
            />
          ))}
        </ol>
      )}
      <div className="site-gallery-footer">
        <input
          ref={fileInput}
          type="file"
          hidden
          multiple
          accept={SITE_IMAGE_TYPES.join(",")}
          onChange={(event) => upload(event.target.files)}
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button
          id={addId}
          tone="secondary"
          disabled={busy || room === 0}
          aria-describedby={hintId}
          aria-busy={busy}
          onClick={() => fileInput.current?.click()}
        >
          {busy ? "Subiendo fotos…" : "Añadir fotos"}
        </Button>
        <span className="muted">{photos.length} de {SITE_GALLERY_MAX} fotos</span>
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <p role="status" aria-live="polite" className="visually-hidden">{announcement}</p>
    </section>
  );
}
