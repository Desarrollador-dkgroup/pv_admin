"use client";

import { useActionState, useState } from "react";
import { saveDestinationAction } from "@/app/panel/sitios/destinos/actions";
import { Button } from "@/components/ui";
import {
  DESTINATION_IMAGE_BUCKET,
  DESTINATION_IMAGE_MAX_BYTES,
  DESTINATION_IMAGE_TYPES,
  extensionForImage,
} from "@/lib/panel-destinations";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export type DestinationValues = {
  id: string;
  provinceId: string;
  name: string;
  subtitle: string;
  description: string;
  cardImagePath: string;
  cardImageUrl: string | null;
  bannerImagePath: string;
  bannerImageUrl: string | null;
  mapsEmbed: string;
};

type ProvinceOption = { id: string; label: string };

// Campo de imagen con vista previa, validación y subida a la carpeta del destino.
function ImageField({
  destinationId,
  fieldName,
  title,
  guide,
  previewClass,
  initialPath,
  initialUrl,
  onBusyChange,
}: {
  destinationId: string;
  fieldName: string;
  title: string;
  guide: string;
  previewClass?: string;
  initialPath: string;
  initialUrl: string | null;
  onBusyChange: (busy: boolean) => void;
}) {
  const [path, setPath] = useState(initialPath);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  // Valida el archivo y lo sube a Storage en la carpeta del destino.
  async function upload(file: File | undefined) {
    setError("");
    if (!file) return;
    if (!(DESTINATION_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError("La imagen debe ser JPG, PNG o WebP.");
      return;
    }
    if (file.size > DESTINATION_IMAGE_MAX_BYTES) {
      setError("La imagen no puede pesar más de 3 MB.");
      return;
    }
    setUploading(true);
    onBusyChange(true);
    try {
      const newPath = `${destinationId}/${crypto.randomUUID()}.${extensionForImage(file.type)}`;
      const supabase = getSupabaseBrowserClient();
      const { error: uploadError } = await supabase.storage
        .from(DESTINATION_IMAGE_BUCKET)
        .upload(newPath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setError("No se pudo subir la imagen. Intenta de nuevo.");
        return;
      }
      setPath(newPath);
      setUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  }

  return (
    <section className="destination-block">
      <h3>{title}</h3>
      <p className="muted">{guide}</p>
      <input type="hidden" name={fieldName} value={path} />
      <div className="destination-image-row">
        <div className={`destination-image-preview ${previewClass ?? ""}`}>
          {url ? (
            // Vista previa de la imagen subida; la URL pública no necesita optimización.
            <img src={url} alt="" />
          ) : (
            <span className="muted">Sin imagen</span>
          )}
        </div>
        <div className="destination-image-actions">
          <input
            type="file"
            accept={DESTINATION_IMAGE_TYPES.join(",")}
            onChange={(event) => upload(event.target.files?.[0])}
            disabled={uploading}
            aria-label={title}
          />
          {uploading && <small className="muted">Subiendo imagen…</small>}
          {error && <small role="alert" className="form-error">{error}</small>}
        </div>
      </div>
    </section>
  );
}

// Formulario de un destino: datos, dos imágenes (tarjeta y banner) y mapa de Google.
export function DestinationForm({
  initial,
  provinces,
  isNew,
}: {
  initial: DestinationValues;
  provinces: ProvinceOption[];
  isNew: boolean;
}) {
  const [state, action, pending] = useActionState(saveDestinationAction, { error: "" });
  const [cardBusy, setCardBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [mapsInput, setMapsInput] = useState(initial.mapsEmbed);
  const mapsUrl = extractMapsEmbedUrl(mapsInput);
  const mapsInvalid = mapsInput.trim() !== "" && !mapsUrl;
  const uploading = cardBusy || bannerBusy;

  return (
    <form action={action} className="destination-form">
      <input type="hidden" name="destination_id" value={initial.id} />
      {!isNew && <input type="hidden" name="province_id" value={initial.provinceId} />}

      <div className="destination-form-grid">
        <label className="field">
          Provincia
          {isNew ? (
            <select name="province_id" required defaultValue={initial.provinceId}>
              <option value="">Selecciona una provincia</option>
              {provinces.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          ) : (
            <input value={initial.provinceId} readOnly />
          )}
        </label>
        <label className="field">
          Nombre del destino
          <input name="name" defaultValue={initial.name} required minLength={2} maxLength={80} />
        </label>
        <label className="field destination-span">
          Subtítulo (aparece sobre la imagen de la tarjeta)
          <input
            name="subtitle"
            defaultValue={initial.subtitle}
            maxLength={120}
            placeholder="Ej. Playas y vida caribeña"
          />
        </label>
        <label className="field destination-span">
          Descripción (aparece en el banner)
          <textarea
            name="description"
            defaultValue={initial.description}
            rows={4}
            maxLength={1200}
            placeholder="Describe el destino para los visitantes."
          />
        </label>
      </div>

      <ImageField
        destinationId={initial.id}
        fieldName="card_image_storage_path"
        title="Imagen de la tarjeta"
        guide="Tamaño recomendado: 1200 × 600 px (horizontal, proporción 2:1). Formatos JPG, PNG o WebP, máximo 3 MB. Se muestra en la tarjeta de destinos."
        initialPath={initial.cardImagePath}
        initialUrl={initial.cardImageUrl}
        onBusyChange={setCardBusy}
      />

      <ImageField
        destinationId={initial.id}
        fieldName="banner_image_storage_path"
        title="Imagen del banner"
        guide="Tamaño recomendado: 1920 × 800 px (horizontal, proporción 12:5). Formatos JPG, PNG o WebP, máximo 3 MB. Es la imagen grande de la página del destino."
        previewClass="destination-image-preview--banner"
        initialPath={initial.bannerImagePath}
        initialUrl={initial.bannerImageUrl}
        onBusyChange={setBannerBusy}
      />

      <section className="destination-block">
        <h3>Ubicación en Google Maps</h3>
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

      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <div className="destination-actions">
        <Button type="submit" disabled={pending || uploading || mapsInvalid}>
          {pending ? "Guardando…" : isNew ? "Crear destino" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
