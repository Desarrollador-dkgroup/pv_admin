"use client";

import { ArrowDown, ArrowUp, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { sitePhotoUrl } from "@/lib/panel-sites";

export type GalleryAction = "up" | "down" | "cover" | "remove";

// Una foto de la galería con sus controles. Cada botón tiene texto visible y una etiqueta
// que dice a qué foto afecta, para que se entienda también con lector de pantalla.
export function SiteGalleryItem({
  photo,
  index,
  total,
  disabled,
  onAction,
}: {
  photo: string;
  index: number;
  total: number;
  disabled: boolean;
  onAction: (action: GalleryAction, index: number) => void;
}) {
  const number = index + 1;
  const isCover = index === 0;
  const label = isCover ? `Foto ${number} de ${total}, portada` : `Foto ${number} de ${total}`;

  return (
    <li className="site-gallery-item">
      <figure>
        <img src={sitePhotoUrl(photo) ?? ""} alt={label} loading="lazy" />
        <figcaption>
          {isCover ? <span className="site-gallery-cover">Portada</span> : `Foto ${number}`}
        </figcaption>
      </figure>
      <div
        className="site-gallery-controls"
        role="group"
        aria-label={`Acciones de la foto ${number}`}
      >
        <Button
          tone="quiet"
          data-action="up"
          disabled={disabled || isCover}
          aria-label={`Mover la foto ${number} una posición antes`}
          onClick={() => onAction("up", index)}
        >
          <ArrowUp aria-hidden="true" size={16} /> Antes
        </Button>
        <Button
          tone="quiet"
          data-action="down"
          disabled={disabled || number === total}
          aria-label={`Mover la foto ${number} una posición después`}
          onClick={() => onAction("down", index)}
        >
          <ArrowDown aria-hidden="true" size={16} /> Después
        </Button>
        {!isCover && (
          <Button
            tone="secondary"
            data-action="cover"
            disabled={disabled}
            aria-label={`Usar la foto ${number} como portada`}
            onClick={() => onAction("cover", index)}
          >
            <Star aria-hidden="true" size={16} /> Portada
          </Button>
        )}
        <Button
          tone="danger"
          data-action="remove"
          disabled={disabled}
          aria-label={`Quitar la foto ${number}`}
          onClick={() => onAction("remove", index)}
        >
          <Trash2 aria-hidden="true" size={16} /> Quitar
        </Button>
      </div>
    </li>
  );
}
