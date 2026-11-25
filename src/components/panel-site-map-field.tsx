"use client";

import { useId, useState } from "react";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";

// Campo del mapa de Google de un sitio: acepta el iframe completo o su URL y muestra la vista
// previa. Avisa al formulario si el código no es válido para impedir guardarlo.
export function SiteMapField({
  initialValue,
  onInvalidChange,
}: {
  initialValue: string;
  onInvalidChange: (invalid: boolean) => void;
}) {
  const [input, setInput] = useState(initialValue);
  const url = extractMapsEmbedUrl(input);
  const invalid = input.trim() !== "" && !url;
  const hintId = useId();
  const errorId = useId();

  function change(value: string) {
    setInput(value);
    onInvalidChange(value.trim() !== "" && !extractMapsEmbedUrl(value));
  }

  return (
    <section className="destination-block">
      <h3>Mapa de Google</h3>
      <p className="muted" id={hintId}>
        En Google Maps busca el lugar, pulsa <strong>Compartir → Insertar un mapa</strong> y
        pega aquí el código completo (iframe) o solo la URL del atributo src.
      </p>
      <textarea
        name="maps_embed"
        value={input}
        onChange={(event) => change(event.target.value)}
        rows={3}
        placeholder='<iframe src="https://www.google.com/maps/embed?..."></iframe>'
        aria-label="Código del mapa de Google"
        aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
        aria-invalid={invalid}
      />
      {invalid && (
        <small role="alert" id={errorId} className="form-error">
          Ese código no es un mapa de Google válido.
        </small>
      )}
      {url && (
        <iframe
          className="destination-map"
          src={url}
          title="Vista previa del mapa"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </section>
  );
}
