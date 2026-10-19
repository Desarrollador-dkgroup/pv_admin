"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell } from "lucide-react";
import type { PanelNotification } from "@/lib/panel-notifications";

// Muestra la campana con un resumen de hasta tres avisos reales.
export function PanelNotifications({ items }: { items: PanelNotification[] }) {
  // Controla si el resumen está desplegado.
  const [open, setOpen] = useState(false);
  const preview = items.slice(0, 3);

  return (
    <div className="notification-menu">
      <button
        type="button"
        className="notification-trigger"
        aria-expanded={open}
        aria-controls="resumen-notificaciones"
        aria-label={`Notificaciones: ${items.length} avisos`}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={20} aria-hidden="true" />
        {items.length > 0 && (
          <span className="notification-dot">{items.length > 9 ? "9+" : items.length}</span>
        )}
      </button>
      {open && (
        <div id="resumen-notificaciones" className="notification-popover">
          <h2>Notificaciones</h2>
          {preview.length ? (
            preview.map((item) => (
              // Cada aviso enlaza a su sección y cierra el resumen al navegar.
              <Link
                key={item.id}
                href={item.href}
                className={`notification-summary-item ${item.tone}`}
                onClick={() => setOpen(false)}
              >
                <b>{item.title}</b>
                <span>{item.detail}</span>
              </Link>
            ))
          ) : (
            <p className="muted">No hay avisos pendientes.</p>
          )}
          <Link
            className="button secondary"
            href="/panel/notificaciones"
            onClick={() => setOpen(false)}
          >
            Ver todas las notificaciones
          </Link>
        </div>
      )}
    </div>
  );
}
