"use client";

import Image from "next/image";
import { useState } from "react";
import type { ChangeEvent } from "react";
import { Badge, Button, DesignIcon, Modal, Panel } from "@/components/ui";
import type { PreviewEntity, PreviewPhoto } from "@/types/preview";
import { usePreview } from "./context";

const illustrativePhotos: PreviewPhoto[] = ["Fachada", "Habitación", "Patio", "Restaurante"].map(
  (name, index) => ({ id: `illustration-${index}`, name, cover: index === 0 }),
);

// Convierte imágenes seleccionadas en datos locales; no realiza cargas a Supabase.
function readPhoto(file: File): Promise<PreviewPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () =>
      resolve({
        id: crypto.randomUUID(),
        name: file.name,
        source: String(reader.result),
        cover: false,
      });
    reader.readAsDataURL(file);
  });
}

export function Gallery({ record }: { record: PreviewEntity }) {
  const { save, notify } = usePreview();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<PreviewPhoto | null>(null);
  const [loading, setLoading] = useState(false);
  const photos =
    record.fields.gallery_initialized === "true" || record.photos.length
      ? record.photos
      : illustrativePhotos;

  function update(next: PreviewPhoto[], action: string) {
    // Garantiza una única portada y permite galerías vacías.
    const normalized =
      next.length && !next.some((photo) => photo.cover)
        ? next.map((photo, index) => ({ ...photo, cover: index === 0 }))
        : next;
    save(
      { ...record, photos: normalized, fields: { ...record.fields, gallery_initialized: "true" } },
      action,
    );
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = [...(input.files ?? [])];
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1_000_000,
      ) ||
      files.length + photos.filter((photo) => photo.source).length > 3
    ) {
      notify("En la vista previa se permiten hasta 3 imágenes JPG, PNG o WebP de 1 MB cada una.");
      input.value = "";
      return;
    }
    setLoading(true);
    try {
      const uploaded = await Promise.all(files.map(readPhoto));
      const actual = photos.filter((photo) => photo.source);
      update([...actual, ...uploaded], "Imágenes añadidas");
      setUploadOpen(false);
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudieron añadir las imágenes.");
    } finally {
      setLoading(false);
      input.value = "";
    }
  }

  function move(index: number, direction: number) {
    const next = [...photos];
    const destination = index + direction;
    [next[index], next[destination]] = [next[destination], next[index]];
    update(next, "Orden de la galería actualizado");
  }

  return (
    <>
      <div className="section-heading">
        <p>Elige una portada y organiza las fotografías.</p>
        <Button onClick={() => setUploadOpen(true)}>+ Subir imágenes</Button>
      </div>
      <div className="gallery-grid">
        {photos.map((photo, index) => (
          <Panel key={photo.id}>
            {photo.source ? (
              <Image
                src={photo.source}
                alt={photo.name}
                width={328}
                height={180}
                className="photo-image"
                unoptimized
              />
            ) : (
              <div className="photo-placeholder">
                <DesignIcon name="hotel" />
                <h2>{photo.name}</h2>
              </div>
            )}
            <small>{photo.source ? photo.name : "Imagen de referencia del prototipo"}</small>
            {photo.cover ? (
              <Badge>Portada</Badge>
            ) : (
              <Button
                tone="secondary"
                onClick={() =>
                  update(
                    photos.map((item) => ({ ...item, cover: item.id === photo.id })),
                    "Portada seleccionada",
                  )
                }
              >
                Elegir como portada
              </Button>
            )}
            <div className="photo-actions">
              <Button
                tone="quiet"
                disabled={index === 0}
                aria-label={`Mover ${photo.name} hacia atrás`}
                onClick={() => move(index, -1)}
              >
                ←
              </Button>
              <Button
                tone="quiet"
                disabled={index === photos.length - 1}
                aria-label={`Mover ${photo.name} hacia adelante`}
                onClick={() => move(index, 1)}
              >
                →
              </Button>
              <Button tone="quiet" onClick={() => setDeleting(photo)}>
                Eliminar
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      {!photos.length && (
        <Panel>
          <h2>Añade la primera fotografía del servicio</h2>
        </Panel>
      )}
      {uploadOpen && (
        <Modal title="Añadir imágenes a la galería" onClose={() => setUploadOpen(false)}>
          <div className="upload-zone">
            <DesignIcon name="hotel" />
            <h2>Selecciona tus imágenes</h2>
            <p>JPG, PNG o WebP · almacenamiento local de prueba</p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              aria-label="Seleccionar imágenes"
              disabled={loading}
              onChange={upload}
            />
            {loading && <p role="status">Preparando imágenes...</p>}
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal title="¿Eliminar esta fotografía?" onClose={() => setDeleting(null)}>
          <p>{deleting.name} se retirará de esta galería de prueba.</p>
          <div className="actions">
            <Button tone="secondary" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                update(
                  photos.filter((photo) => photo.id !== deleting.id),
                  "Fotografía eliminada",
                );
                setDeleting(null);
              }}
            >
              Eliminar fotografía
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
