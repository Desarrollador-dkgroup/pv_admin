"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Campo de fotos con vista previa antes de guardar. Los archivos siguen viajando en el
// FormData del formulario bajo `name`; "Quitar" los saca del campo sin volver a elegirlos.
export function PhotoPicker({
  name,
  label,
  limit,
}: {
  name: string;
  label: string;
  limit: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  // URL temporales de cada vista previa; se liberan al cambiar la selección.
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  // Sincroniza el campo real con la lista mostrada.
  function apply(next: File[]) {
    const transfer = new DataTransfer();
    next.forEach((file) => transfer.items.add(file));
    if (input.current) input.current.files = transfer.files;
    setFiles(next);
  }

  return (
    <div className="field photo-picker">
      <label>
        {label} ({files.length} de {limit})
        <input
          ref={input}
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => apply([...(event.currentTarget.files ?? [])].slice(0, limit))}
        />
      </label>
      {previews.length > 0 && (
        <div className="photo-picker-grid">
          {previews.map((url, index) => (
            <figure key={url}>
              {/* Vista previa local (blob:); no pasa por next/image. */}
              <img src={url} alt={`Vista previa ${index + 1}`} />
              <button
                type="button"
                className="button quiet"
                onClick={() => apply(files.filter((_, position) => position !== index))}
              >
                Quitar
              </button>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
