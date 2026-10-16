"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Panel } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Photo = {
  id: string;
  storage_path: string;
  is_cover: boolean;
  position: number;
};

export type GalleryGroup = {
  id: string;
  label: string;
  table: "service_photos" | "room_type_photos";
  relationId: string | null;
  limit: number;
  photos: Photo[];
};

// Carga y organiza imágenes reales en Supabase Storage.
export function PanelGalleryManager({
  serviceId,
  groups,
}: {
  serviceId: string;
  groups: GalleryGroup[];
}) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "");
  const [items, setItems] = useState(groups);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = items.find((group) => group.id === activeId) ?? items[0];

  async function upload(files: FileList | null) {
    if (!files?.length || !active) return;
    const selected = [...files];
    if (selected.some((file) => !isValidImage(file))) {
      setMessage("Usa imágenes JPG, PNG o WebP de hasta 8 MB cada una.");
      return;
    }
    if (active.photos.length + selected.length > active.limit) {
      setMessage(`Esta galería admite un máximo de ${active.limit} fotos.`);
      return;
    }

    setBusy(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const uploaded: Photo[] = [];

    try {
      for (const [index, file] of selected.entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
        const folder = active.relationId ?? "general";
        const storagePath = [
          serviceId,
          active.id,
          folder,
          `${crypto.randomUUID()}.${extension}`,
        ].join("/");
        const storage = await supabase.storage
          .from("service-media")
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });
        if (storage.error) throw new Error(storage.error.message);

        const photo = await insertPhoto(supabase, active, serviceId, storagePath, index);
        if (photo.error || !photo.data) {
          await supabase.storage.from("service-media").remove([storagePath]);
          throw new Error(photo.error?.message ?? "No se pudo guardar la fotografía.");
        }
        uploaded.push(photo.data);
      }

      setItems((current) =>
        current.map((group) =>
          group.id === active.id
            ? { ...group, photos: [...group.photos, ...uploaded] }
            : group,
        ),
      );
      setMessage("Fotografías guardadas en la galería.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudieron subir las fotos.");
    } finally {
      setBusy(false);
    }
  }

  async function chooseCover(photo: Photo) {
    if (!active) return;
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    try {
      let coverQuery = supabase
        .from(active.table)
        .update({ is_cover: false });
      if (active.table === "room_type_photos") {
        coverQuery = coverQuery.eq("room_type_id", active.relationId ?? "");
      } else if (active.relationId) {
        coverQuery = coverQuery.eq("lodging_area_id", active.relationId);
      } else {
        coverQuery = coverQuery
          .eq("service_id", serviceId)
          .is("lodging_area_id", null);
      }
      const cleared = await coverQuery;
      if (cleared.error) throw new Error(cleared.error.message);

      const selected = await supabase
        .from(active.table)
        .update({ is_cover: true })
        .eq("id", photo.id);
      if (selected.error) throw new Error(selected.error.message);

      setItems((current) =>
        current.map((group) =>
          group.id === active.id
            ? {
                ...group,
                photos: group.photos.map((item) => ({
                  ...item,
                  is_cover: item.id === photo.id,
                })),
              }
            : group,
        ),
      );
      setMessage("Portada actualizada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cambiar la portada.");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto(photo: Photo) {
    if (!active) return;
    setBusy(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const deleted = await supabase.from(active.table).delete().eq("id", photo.id);
      if (deleted.error) throw new Error(deleted.error.message);
      const removed = await supabase.storage
        .from("service-media")
        .remove([photo.storage_path]);
      if (removed.error) throw new Error(removed.error.message);
      setItems((current) =>
        current.map((group) =>
          group.id === active.id
            ? { ...group, photos: group.photos.filter((item) => item.id !== photo.id) }
            : group,
        ),
      );
      setMessage("Fotografía eliminada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar la foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel>
        <h2>Galerías del servicio</h2>
        <label className="field">
          Sección de imágenes
          <select value={active?.id ?? ""} onChange={(event) => setActiveId(event.target.value)}>
            {items.map((group) => (
              <option key={group.id} value={group.id}>
                {group.label} · {group.photos.length}/{group.limit}
              </option>
            ))}
          </select>
        </label>
        {active && (
          <>
            <p>
              {active.photos.length} de {active.limit} fotografías
            </p>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={busy || active.photos.length >= active.limit}
              onChange={(event) => {
                void upload(event.currentTarget.files);
                event.currentTarget.value = "";
              }}
            />
          </>
        )}
      </Panel>
      {active?.photos.length ? (
        <div className="gallery-grid">
          {active.photos.map((photo) => (
            <Panel key={photo.id}>
              <Image
                src={publicUrl(photo.storage_path)}
                alt=""
                width={420}
                height={260}
                unoptimized
                className="photo-image"
              />
              {photo.is_cover ? <span className="badge">Portada</span> : null}
              <div className="actions">
                {!photo.is_cover && (
                  <Button
                    tone="secondary"
                    disabled={busy}
                    onClick={() => void chooseCover(photo)}
                  >
                    Usar como portada
                  </Button>
                )}
                <Button
                  tone="quiet"
                  disabled={busy}
                  onClick={() => void removePhoto(photo)}
                >
                  Eliminar
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <h2>Esta galería todavía no tiene fotos</h2>
          <p>Las imágenes que subas se guardarán en Supabase Storage.</p>
        </Panel>
      )}
      {message && <p role="status">{message}</p>}
    </>
  );
}

// Inserta la referencia en la tabla que corresponde a la galería seleccionada.
async function insertPhoto(
  supabase: ReturnType<typeof getSupabaseBrowserClient>,
  group: GalleryGroup,
  serviceId: string,
  storagePath: string,
  offset: number,
) {
  if (group.table === "room_type_photos") {
    return supabase
      .from("room_type_photos")
      .insert({
        room_type_id: group.relationId,
        storage_path: storagePath,
        position: group.photos.length + offset,
        is_cover: group.photos.length === 0 && offset === 0,
      })
      .select("id, storage_path, is_cover, position")
      .single();
  }

  return supabase
    .from("service_photos")
    .insert({
      service_id: serviceId,
      lodging_area_id: group.relationId,
      storage_path: storagePath,
      position: group.photos.length + offset,
      is_cover: group.photos.length === 0 && offset === 0,
    })
    .select("id, storage_path, is_cover, position")
    .single();
}

function isValidImage(file: File) {
  return ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    && file.size <= 8_000_000;
}

function publicUrl(path: string) {
  return getSupabaseBrowserClient().storage.from("service-media").getPublicUrl(path).data.publicUrl;
}
