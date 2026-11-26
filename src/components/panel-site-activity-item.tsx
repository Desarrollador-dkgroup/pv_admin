"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ActivityIcon, automaticIconKey } from "@/components/activity-icon";
import { PanelSelect } from "@/components/panel-select";
import { Button } from "@/components/ui";
import {
  ACTIVITY_ICONS, SITE_ACTIVITY_DESCRIPTION_MAX, SITE_ACTIVITY_NAME_MAX,
} from "@/lib/panel-site-activities";

export type ActivityAction = "up" | "down" | "remove";
export type EditableActivity = { key: string; name: string; description: string; icon: string };

const iconLabel = (key: string) => ACTIVITY_ICONS.find((icon) => icon.key === key)?.label ?? key;

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
  // En automático se dice qué icono saldrá, para que no haya sorpresas en la web.
  const automatic = activity.icon ? "" : iconLabel(automaticIconKey(activity.name));

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
        <div className="site-activity-icon-row">
          <span className="site-activity-icon-preview">
            <ActivityIcon name={activity.name} icon={activity.icon} size={22} />
          </span>
          <label className="field">
            Icono
            <PanelSelect
              value={activity.icon}
              aria-label={`Icono de la actividad ${number}`}
              onChange={(event) => onChange(index, { icon: event.target.value })}
            >
              <option value="">Automático (según el nombre)</option>
              {ACTIVITY_ICONS.map((icon) => (
                <option key={icon.key} value={icon.key}>{icon.label}</option>
              ))}
            </PanelSelect>
          </label>
          {automatic && (
            <span className="muted site-activity-icon-chosen">Se usará: {automatic}</span>
          )}
        </div>
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
