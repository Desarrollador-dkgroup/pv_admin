"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { deleteTouristSiteAction, saveTouristSiteAction } from "@/app/panel/sitios/actions";
import { Button, Panel } from "@/components/ui";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";
import {
  SITE_IMAGE_BUCKET,
  SITE_IMAGE_MAX_BYTES,
  SITE_IMAGE_TYPES,
  siteImageExtension,
  sitePhotoUrl,
} from "@/lib/panel-sites";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Option = { id: string; label: string };
type Site = {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string | null;
  province_id: string | null;
  sort_order: number;
  photo_storage_path: string | null;
  maps_embed_url: string | null;
};

// Formulario de un sitio turístico: datos, foto, ubicación y mapa de Google.
export function SiteForm({
  site,
  provinces,
  defaultProvinceId = "",
}: {
  site: Site | null;
  provinces: Option[];
  defaultProvinceId?: string;
}) {
  const [state, action, pending] = useActionState(saveTouristSiteAction, { error: "" });
  // La carpeta de la foto usa el identificador del sitio. Un sitio nuevo lo recibe al subir
  // su primera imagen, así la foto ya queda guardada en su carpeta antes de crear el sitio.
  const [siteId, setSiteId] = useState(site?.id ?? "");
  const [photoPath, setPhotoPath] = useState(site?.photo_storage_path ?? "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [mapsInput, setMapsInput] = useState(site?.maps_embed_url ?? "");
  const mapsUrl = extractMapsEmbedUrl(mapsInput);
  const mapsInvalid = mapsInput.trim() !== "" && !mapsUrl;

  // Valida la imagen y la sube a la carpeta del sitio.
  async function uploadPhoto(file: File | undefined) {
    setPhotoError("");
    if (!file) return;
    if (!(SITE_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setPhotoError("La imagen debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > SITE_IMAGE_MAX_BYTES) {
      setPhotoError("La imagen no puede pesar más de 3 MB.");
      return;
    }
    const folder = siteId || crypto.randomUUID();
    setSiteId(folder);
    setPhotoBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const path = `${folder}/${crypto.randomUUID()}.${siteImageExtension(file.type)}`;
      const { error: uploadError } = await supabase.storage
        .from(SITE_IMAGE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setPhotoError("No se pudo subir la imagen. Intenta de nuevo.");
        return;
      }
      setPhotoPath(supabase.storage.from(SITE_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl);
    } finally {
      setPhotoBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <form action={action} className="site-form">
      <input type="hidden" name="site_id" value={siteId} />
      <input type="hidden" name="is_new" value={site ? "" : "1"} />
      <input type="hidden" name="photo_storage_path" value={photoPath} />
      <Panel>
        <div className="form-row">
          <label className="field">
            Nombre del sitio
            <input name="name" required defaultValue={site?.name ?? ""} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            País
            <input value="Panamá" readOnly aria-readonly="true" />
          </label>
          <label className="field">
            Provincia destino
            <select
            name="province_id"
            required
            defaultValue={site?.province_id ?? defaultProvinceId}
          >
              <option value="" disabled>Selecciona una provincia</option>
              {provinces.map((province) => (
                <option key={province.id} value={province.id}>{province.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            Orden en la web
            <input
              name="sort_order"
              type="number"
              min={0}
              max={32767}
              defaultValue={site?.sort_order ?? 0}
            />
          </label>
        </div>

        <section className="destination-block">
          <h3>Foto del sitio</h3>
          <p className="muted">
            Tamaño recomendado: 1920 × 1080 px (horizontal). Formatos JPG, PNG o WebP, máximo
            3 MB. Es la imagen grande de la página del sitio.
          </p>
          <div className="destination-image-row">
            <div className="destination-image-preview">
              {photoPath ? (
                // Vista previa de la foto; la URL pública no necesita optimización aquí.
                <img src={sitePhotoUrl(photoPath) ?? ""} alt="" />
              ) : (
                <span className="muted">Sin imagen</span>
              )}
            </div>
            <div className="destination-image-actions">
              <input
                ref={fileInput}
                type="file"
                hidden
                accept={SITE_IMAGE_TYPES.join(",")}
                onChange={(event) => uploadPhoto(event.target.files?.[0])}
                aria-label="Foto del sitio"
              />
              <div className="actions">
                <Button
                  type="button"
                  tone="secondary"
                  disabled={photoBusy}
                  onClick={() => fileInput.current?.click()}
                >
                  {photoBusy ? "Subiendo imagen…" : photoPath ? "Cambiar imagen" : "Añadir imagen"}
                </Button>
                {photoPath && (
                  <Button type="button" tone="quiet" onClick={() => setPhotoPath("")}>
                    Quitar imagen
                  </Button>
                )}
              </div>
              {photoError && <small role="alert" className="form-error">{photoError}</small>}
            </div>
          </div>
        </section>


        <section className="destination-block">
          <h3>Mapa de Google</h3>
          <p className="muted">
            En Google Maps busca el lugar, pulsa <strong>Compartir → Insertar un mapa</strong> y
            pega aquí el código completo (iframe) o solo la URL del atributo src.
          </p>
          <textarea
            name="maps_embed"
            value={mapsInput}
            onChange={(event) => setMapsInput(event.target.value)}
            rows={3}
            placeholder='<iframe src="https://www.google.com/maps/embed?..."></iframe>'
            aria-invalid={mapsInvalid}
          />
          {mapsInvalid && (
            <small role="alert" className="form-error">
              Ese código no es un mapa de Google válido.
            </small>
          )}
          {mapsUrl && (
            <iframe
              className="destination-map"
              src={mapsUrl}
              title="Vista previa del mapa"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </section>

        <label className="field">
          Descripción breve
          <input name="short_description" defaultValue={site?.short_description ?? ""} />
        </label>
        <label className="field">
          Descripción
          <textarea name="description" required rows={5} defaultValue={site?.description ?? ""} />
        </label>
      </Panel>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <div className="actions">
        <Button type="submit" disabled={pending || photoBusy || mapsInvalid}>
          {pending ? "Guardando…" : site ? "Guardar sitio" : "Crear sitio"}
        </Button>
        {site && (
          <Button
            type="button"
            tone="quiet"
            onClick={async () => {
              if (!confirm(`¿Eliminar "${site.name}"? Esta acción no se puede deshacer.`)) return;
              await deleteTouristSiteAction(site.id);
            }}
          >
            Eliminar sitio
          </Button>
        )}
        <Link className="button quiet" href={site ? `/panel/sitios/${site.id}` : "/panel/sitios"}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
