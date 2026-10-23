"use client";

import Image from "next/image";
import { useState } from "react";
import { Button, Panel } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type Photo = {
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
  compact = false,
}: {
  serviceId: string;
  groups: GalleryGroup[];
  // Una sola galería dentro de otra tarjeta (por ejemplo, la de una habitación).
  compact?: boolean;
}) {
  const [activeId, setActiveId] = useState(groups[0]?.id ?? "");
  const [items, setItems] = useState(groups);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = items.find((group) => group.id === activeId) ?? items[0];

  async function refreshGroup(group: GalleryGroup) {
    const supabase = getSupabaseBrowserClient();
    let query = supabase.from(group.table)
      .select("id, storage_path, is_cover, position");
    if (group.table === "room_type_photos") {
      query = query.eq("room_type_id", group.relationId ?? "");
    } else if (group.relationId) {
      query = query.eq("service_id", serviceId).eq("lodging_area_id", group.relationId);
    } else {
      query = query.eq("service_id", serviceId).is("lodging_area_id", null);
    }
    const { data, error } = await query.order("position");
    if (error) throw new Error("No se pudo actualizar la galería. Recarga la página.");
    setItems((current) => current.map((item) =>
      item.id === group.id ? { ...item, photos: data ?? [] } : item));
  }

  async function upload(files: FileList | null) {
    if (!files?.length || !active) return;
    const selected = [...files];
    const invalid = validatePhotos(active, selected);
    if (invalid) {
      setMessage(invalid);
      return;
    }

    setBusy(true);
    setMessage("");
    const uploaded: Photo[] = [];
    let result = "Fotografías guardadas en la galería.";

    try {
      await uploadPhotosToGroup(serviceId, active, selected, uploaded);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "No se pudieron subir las fotos.";
      result = uploaded.length
        ? `Se ${uploaded.length === 1 ? "guardó 1 foto" : `guardaron ${uploaded.length} fotos`}, pero las demás no: ${reason}`
        : reason;
    } finally {
      try {
        await refreshGroup(active);
      } catch {
        // Si la lectura falla, refleja al menos las filas confirmadas por esta operación.
        if (uploaded.length) setItems((current) => current.map((group) =>
          group.id === active.id
            ? { ...group, photos: [...group.photos, ...uploaded] }
            : group));
        result += " Recarga la página para confirmar la galería.";
      }
      setMessage(result);
      setBusy(false);
    }
  }

  async function chooseCover(photo: Photo) {
    if (!active) return;
    setBusy(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    const previous = active.photos.find((item) => item.is_cover);
    let cleared = false;
    let result = "Portada actualizada.";
    try {
      let coverQuery = supabase
        .from(active.table)
        .update({ is_cover: false });
      if (active.table === "room_type_photos") {
        coverQuery = coverQuery.eq("room_type_id", active.relationId ?? "");
      } else if (active.relationId) {
        coverQuery = coverQuery.eq("service_id", serviceId)
          .eq("lodging_area_id", active.relationId);
      } else {
        coverQuery = coverQuery
          .eq("service_id", serviceId)
          .is("lodging_area_id", null);
      }
      const clearResult = await coverQuery;
      if (clearResult.error) throw new Error(clearResult.error.message);
      cleared = true;

      const selected = await supabase
        .from(active.table)
        .update({ is_cover: true })
        .eq("id", photo.id)
        .select("id")
        .maybeSingle();
      if (selected.error || !selected.data) {
        throw new Error(selected.error?.message ?? "No se encontró la foto seleccionada.");
      }
    } catch (error) {
      result = error instanceof Error ? error.message : "No se pudo cambiar la portada.";
      if (cleared && previous) {
        const restored = await supabase.from(active.table)
          .update({ is_cover: true }).eq("id", previous.id);
        if (restored.error) result += " No se pudo restaurar la portada anterior.";
      }
    } finally {
      try {
        await refreshGroup(active);
      } catch {
        result += " Recarga la página para comprobar la portada.";
      }
      setMessage(result);
      setBusy(false);
    }
  }

  async function removePhoto(photo: Photo) {
    if (!active) return;
    if (!window.confirm("¿Eliminar esta foto de la galería?")) return;
    setBusy(true);
    setMessage("");
    const supabase = getSupabaseBrowserClient();
    let deletedFromCatalog = false;
    let result = photo.is_cover
      ? "Fotografía eliminada. Si quedan fotos, selecciona una nueva portada."
      : "Fotografía eliminada.";
    try {
      const deleted = await supabase.from(active.table)
        .delete().eq("id", photo.id).select("id").maybeSingle();
      if (deleted.error || !deleted.data) {
        throw new Error(deleted.error?.message ?? "No se encontró la foto para eliminar.");
      }
      deletedFromCatalog = true;
      setItems((current) => current.map((group) =>
        group.id === active.id
          ? { ...group, photos: group.photos.filter((item) => item.id !== photo.id) }
          : group));
      const removed = await supabase.storage
        .from("service-media")
        .remove([photo.storage_path]);
      if (removed.error) {
        result = "La foto ya no aparece en la ficha, pero no se pudo limpiar el archivo. Avísanos.";
      }
    } catch (error) {
      result = deletedFromCatalog
        ? "La foto ya no aparece en la ficha, pero no se pudo limpiar el archivo. Avísanos."
        : error instanceof Error ? error.message : "No se pudo eliminar la foto.";
    } finally {
      try {
        await refreshGroup(active);
      } catch {
        result += " Recarga la página para confirmar la galería.";
      }
      setMessage(result);
      setBusy(false);
    }
  }

  const fileInput = active && (
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
  );
  const photoGrid = active?.photos.length ? (
    <div className={compact ? "gallery-grid gallery-grid-compact" : "gallery-grid"}>
      {active.photos.map((photo) => {
        const content = (
          <>
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
          </>
        );
        return compact
          ? <div className="gallery-photo" key={photo.id}>{content}</div>
          : <Panel key={photo.id}>{content}</Panel>;
      })}
    </div>
  ) : null;

  if (compact) {
    return (
      <div className="gallery-inline">
        <p>
          <b>Fotos de {active?.label}</b> · {active?.photos.length ?? 0} de {active?.limit}
        </p>
        {fileInput}
        {photoGrid ?? <p className="muted">Todavía no tiene fotos.</p>}
        {message && <p role="status">{message}</p>}
      </div>
    );
  }

  return (
    <>
      <Panel>
        <h2>Galerías del servicio</h2>
        {items.length > 1 && (
          <label className="field">
            Sección de imágenes
            <select value={active?.id ?? ""} disabled={busy}
              onChange={(event) => setActiveId(event.target.value)}>
              {items.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label} · {group.photos.length}/{group.limit}
                </option>
              ))}
            </select>
          </label>
        )}
        {active && (
          <>
            <p>
              {active.label}: {active.photos.length} de {active.limit} fotografías
            </p>
            {fileInput}
          </>
        )}
      </Panel>
      {photoGrid ?? (
        <Panel>
          <h2>Esta galería todavía no tiene fotos</h2>
          <p>Las imágenes que subas se guardarán en Supabase Storage.</p>
        </Panel>
      )}
      {message && <p role="status">{message}</p>}
    </>
  );
}

// Revisa formato, tamaño y límite antes de subir. Devuelve el motivo o "" si todo está bien.
export function validatePhotos(group: GalleryGroup, files: File[]) {
  if (files.some((file) => !isValidImage(file))) {
    return "Usa imágenes JPG, PNG o WebP de hasta 8 MB cada una.";
  }
  if (group.photos.length + files.length > group.limit) {
    return `Esta galería admite un máximo de ${group.limit} fotos.`;
  }
  return "";
}

// Sube archivos a Storage y registra cada foto en su tabla. Añade a `uploaded` las que
// quedaron guardadas, para informar aunque falle una a mitad del lote.
export async function uploadPhotosToGroup(
  serviceId: string,
  group: GalleryGroup,
  files: File[],
  uploaded: Photo[] = [],
) {
  const supabase = getSupabaseBrowserClient();
  for (const [index, file] of files.entries()) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
    const folder = group.relationId ?? "general";
    const storagePath = [
      serviceId,
      group.id,
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

    const photo = await insertPhoto(supabase, group, serviceId, storagePath, index);
    if (photo.error || !photo.data) {
      await supabase.storage.from("service-media").remove([storagePath]);
      throw new Error(photo.error?.message ?? "No se pudo guardar la fotografía.");
    }
    uploaded.push(photo.data);
  }
  return uploaded;
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
