"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import {
  SITE_ACTIVITY_DESCRIPTION_MAX, SITE_ACTIVITY_NAME_MAX,
} from "@/lib/panel-site-activities";

export type ActivityAction = "up" | "down" | "remove";
export type EditableActivity = { key: string; name: string; description: string };

// Una actividad del sitio: nombre, descripción y controles para ordenarla o quitarla.
// Los campos no tienen `name`: el formulario envía la lista completa como JSON.
export function SiteActivityItem({
  activity,
  index,
  total,
  onChange,
  onAction,
}: {
  activity: EditableActivity;
  index: number;
  total: number;
  onChange: (index: number, changes: Partial<EditableActivity>) => void;
  onAction: (action: ActivityAction, index: number) => void;
}) {
  const number = index + 1;

  return (
    <li className="site-activity-item">
      <fieldset>
        <legend>Actividad {number}</legend>
        <label className="field">
          Nombre
          <input
            value={activity.name}
            required
            maxLength={SITE_ACTIVITY_NAME_MAX}
            placeholder="Por ejemplo: Senderismo"
            onChange={(event) => onChange(index, { name: event.target.value })}
          />
        </label>
        <label className="field">
          Descripción (opcional)
          <textarea
            value={activity.description}
            rows={2}
            maxLength={SITE_ACTIVITY_DESCRIPTION_MAX}
            onChange={(event) => onChange(index, { description: event.target.value })}
          />
        </label>
        <div
          className="site-gallery-controls"
          role="group"
          aria-label={`Acciones de la actividad ${number}`}
        >
          <Button
            tone="quiet"
            data-action="up"
            disabled={index === 0}
            aria-label={`Mover la actividad ${number} una posición antes`}
            onClick={() => onAction("up", index)}
          >
            <ArrowUp aria-hidden="true" size={16} /> Antes
          </Button>
          <Button
            tone="quiet"
            data-action="down"
            disabled={number === total}
            aria-label={`Mover la actividad ${number} una posición después`}
            onClick={() => onAction("down", index)}
          >
            <ArrowDown aria-hidden="true" size={16} /> Después
          </Button>
          <Button
            tone="danger"
            data-action="remove"
            aria-label={`Quitar la actividad ${number}`}
            onClick={() => onAction("remove", index)}
          >
            <Trash2 aria-hidden="true" size={16} /> Quitar
          </Button>
        </div>
      </fieldset>
    </li>
  );
}
