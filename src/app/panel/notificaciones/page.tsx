import Link from "next/link";
import { Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { getPanelNotifications } from "@/lib/panel-notifications";

// Lista completa de avisos reales del alcance de la cuenta, sin el límite de la campana.
export default async function NotificationsPage() {
  const { supabase, role, businessIds } = await getPanelIdentity();
  const notifications = await getPanelNotifications(supabase, role, businessIds, 100);

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Notificaciones</h1>
          <p>Avisos que requieren atención, calculados con los datos actuales.</p>
        </div>
      </header>
      <Panel>
        {notifications.map((item) => (
          <Link className={`notification-card ${item.tone}`} href={item.href} key={item.id}>
            <b>{item.title}</b>
            <span>{item.detail}</span>
            <small className="muted">Abrir sección</small>
          </Link>
        ))}
        {!notifications.length && (
          <p className="muted">No hay avisos pendientes. Todo está al día.</p>
        )}
      </Panel>
    </>
  );
}
