"use client";

import { useId, useRef, useState } from "react";
import {
  type ActivityAction, type EditableActivity, SiteActivityItem,
} from "@/components/panel-site-activity-item";
import { Button } from "@/components/ui";
import { SITE_ACTIVITY_MAX, type SiteActivity } from "@/lib/panel-site-activities";
import { moveListItem } from "@/lib/panel-sites";

// Actividades del sitio («Qué hacer en …»): añadir, editar, ordenar y quitar.
// La lista viaja al servidor como JSON en el campo oculto `activities`.
export function SiteActivities({ initialActivities }: { initialActivities: SiteActivity[] }) {
  const [items, setItems] = useState<EditableActivity[]>(() =>
    initialActivities.map((activity, index) => ({ key: `inicial-${index}`, ...activity })),
  );
  const [announcement, setAnnouncement] = useState("");
  const nextKey = useRef(0);
  const list = useRef<HTMLOListElement>(null);
  const headingId = useId();
  const addId = useId();
  const payload = JSON.stringify(items.map(({ name, description }) => ({ name, description })));

  // Lleva el foco al control indicado de una actividad; si no existe, al botón de añadir.
  function focusActivity(index: number, selector: string) {
    requestAnimationFrame(() => {
      const item = list.current?.children[index];
      const target = item?.querySelector<HTMLElement>(selector)
        ?? item?.querySelector<HTMLElement>("button:enabled");
      (target ?? document.getElementById(addId))?.focus();
    });
  }

  function update(index: number, changes: Partial<EditableActivity>) {
    setItems((current) =>
      current.map((item, position) => (position === index ? { ...item, ...changes } : item)),
    );
  }

  function add() {
    nextKey.current += 1;
    setItems([...items, { key: `nueva-${nextKey.current}`, name: "", description: "" }]);
    setAnnouncement(`Actividad ${items.length + 1} añadida. Escribe su nombre.`);
    focusActivity(items.length, "input");
  }

  function handleAction(action: ActivityAction, index: number) {
    const number = index + 1;
    if (action === "remove") {
      setItems(items.filter((_, position) => position !== index));
      setAnnouncement(`Actividad ${number} quitada. El cambio se guarda al guardar el sitio.`);
      focusActivity(Math.min(index, items.length - 2), '[data-action="remove"]');
      return;
    }
    const target = action === "up" ? index - 1 : index + 1;
    setItems(moveListItem(items, index, target));
    setAnnouncement(`Actividad ${number} movida a la posición ${target + 1}.`);
    focusActivity(target, `[data-action="${action}"]:enabled`);
  }

  return (
    <section className="destination-block" aria-labelledby={headingId}>
      <h3 id={headingId}>Qué hacer en el sitio</h3>
      <p className="muted">
        Actividades que se muestran en la guía y en la página oficial, en este orden. El icono
        se elige solo a partir del nombre.
      </p>
      <input type="hidden" name="activities" value={payload} />
      {items.length === 0 ? (
        <p className="site-gallery-empty">Este sitio aún no tiene actividades.</p>
      ) : (
        <ol ref={list} className="site-activity-list" aria-label="Actividades del sitio">
          {items.map((item, index) => (
            <SiteActivityItem
              key={item.key}
              activity={item}
              index={index}
              total={items.length}
              onChange={update}
              onAction={handleAction}
            />
          ))}
        </ol>
      )}
      <div className="site-gallery-footer">
        <Button
          id={addId}
          tone="secondary"
          disabled={items.length >= SITE_ACTIVITY_MAX}
          onClick={add}
        >
          Añadir actividad
        </Button>
        <span className="muted">{items.length} de {SITE_ACTIVITY_MAX} actividades</span>
      </div>
      <p role="status" aria-live="polite" className="visually-hidden">{announcement}</p>
    </section>
  );
}
