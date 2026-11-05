import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { getPanelNotifications } from "@/lib/panel-notifications";

// Lista completa de avisos reales del alcance de la cuenta, sin el límite de la campana.
export default async function NotificationsPage() {
  const { supabase, role, businessIds } = await getPanelIdentity();
  const notifications = await getPanelNotifications(supabase, role, businessIds, 100);

  return (
    <>
      <PageHeader
        title="Notificaciones"
        description="Avisos que requieren atención, calculados con los datos actuales. Desaparecen al resolverlos."
      />
      {notifications.map((item) => (
        <article className={`panel notice-card ${item.tone === "alert" ? "unread" : ""}`} key={item.id}>
          <span className={`confirm-icon ${item.tone === "alert" ? "danger" : ""}`} aria-hidden="true">
            {item.tone === "alert" ? "!" : "i"}
          </span>
          <div className="list-row-text">
            <b>{item.title}</b>
            <p>{item.detail}</p>
          </div>
          <Link className="button secondary small" href={item.href}>Abrir ›</Link>
        </article>
      ))}
      {!notifications.length && (
        <Panel className="empty-state">
          <h2>Todo al día</h2>
          <p className="muted">No hay avisos pendientes.</p>
        </Panel>
      )}
    </>
  );
}
