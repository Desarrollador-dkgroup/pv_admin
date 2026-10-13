"use client";

import Link from "next/link";
import { useRef } from "react";
import { Badge, Button, DesignIcon, Panel } from "@/components/ui";
import { getPreviewNotifications } from "@/lib/preview-notifications";
import { usePreview } from "./context";

// El desplegable nativo permite cerrar con Escape o haciendo clic fuera de la campana.
export function NotificationSummary() {
  const { data, role } = usePreview();
  const popover = useRef<HTMLDivElement>(null);
  const notifications = getPreviewNotifications(data, role);
  const href = `/vista-previa/${role}/notificaciones`;

  return (
    <>
      <Button
        tone="quiet"
        className="icon-button notification-trigger"
        aria-label={`Notificaciones: ${notifications.length} avisos`}
        popoverTarget="notification-summary"
      >
        <DesignIcon name="bell" />
        {notifications.length > 0 && <span className="notification-dot" aria-hidden="true" />}
      </Button>
      <div
        ref={popover}
        id="notification-summary"
        popover="auto"
        className="notification-popover"
        aria-label="Resumen de notificaciones"
      >
        <header className="section-heading">
          <h2>Notificaciones</h2>
          <Badge>{notifications.length} avisos</Badge>
        </header>
        {notifications.slice(0, 3).map((notification) => (
          <Link
            key={notification.id}
            className="notification-summary-item"
            href={`${href}#${notification.id}`}
            onClick={() => popover.current?.hidePopover()}
          >
            <b>{notification.title}</b>
            <span>{notification.summary}</span>
          </Link>
        ))}
        {!notifications.length && <p>No hay notificaciones por el momento.</p>}
        <Link
          href={href}
          className="button secondary"
          onClick={() => popover.current?.hidePopover()}
        >
          Ver todas las notificaciones
        </Link>
      </div>
    </>
  );
}

// Muestra el detalle completo de los mismos avisos que aparecen en la campana.
export function NotificationsPage() {
  const { data, role } = usePreview();
  const notifications = getPreviewNotifications(data, role);

  return (
    <div className="notification-list">
      <p>{notifications.length} notificaciones disponibles</p>
      {notifications.map((notification) => (
        <article key={notification.id} id={notification.id} className="panel notification-card">
          <h2>{notification.title}</h2>
          <h3>{notification.summary}</h3>
          <p>{notification.description}</p>
          <Link href={notification.href} className="button secondary">
            {notification.action}
          </Link>
        </article>
      ))}
      {!notifications.length && (
        <Panel>
          <h2>Estás al día</h2>
          <p>No hay notificaciones por el momento.</p>
        </Panel>
      )}
    </div>
  );
}
