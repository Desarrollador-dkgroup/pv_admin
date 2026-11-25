import Link from "next/link";
import { Badge, Button, ConfirmSubmit, PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { deleteLeadAction, setLeadStatusAction } from "./actions";

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nueva",
  contactado: "Contactada",
  descartado: "Descartada",
};

// Solicitudes de empresas que quieren publicar su negocio desde el formulario público.
export default async function LeadsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado = "nuevo" } = await searchParams;
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const { data, error } = await getSupabaseAdminClient()
    .from("business_leads")
    .select("id, business_name, legal_name, ruc, contact_person, phone, email, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("No se pudieron cargar las solicitudes.");
  const all = data ?? [];
  const rows = estado === "todas" ? all : all.filter((item) => item.status === estado);
  const filters = [
    { key: "nuevo", label: "Nuevas" },
    { key: "contactado", label: "Contactadas" },
    { key: "descartado", label: "Descartadas" },
    { key: "todas", label: "Todas" },
  ];

  return (
    <>
      <PageHeader
        title="Solicitudes de negocios"
        description="Empresas que quieren publicar su negocio desde el formulario de la app."
      />
      <nav className="chip-row" aria-label="Filtrar solicitudes">
        {filters.map((item) => (
          <Link key={item.key} href={`/panel/solicitudes?estado=${item.key}`}
            className={`chip ${estado === item.key ? "active" : ""}`}>
            {item.label}{" "}
            <span>{item.key === "todas" ? all.length : all.filter((row) => row.status === item.key).length}</span>
          </Link>
        ))}
      </nav>
      {rows.map((item) => (
        <article key={item.id} className={`panel notice-card ${item.status === "nuevo" ? "unread" : ""}`}>
          <span className="notice-icon" aria-hidden="true">🏢</span>
          <div className="list-row-text">
            <div className="actions">
              <Badge tone={item.status === "nuevo" ? "info" : "neutral"}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Badge>
              <small>{new Date(item.created_at).toLocaleString("es-PA")}</small>
            </div>
            <p><b>{item.business_name}</b> · {item.legal_name}</p>
            <p className="muted">
              RUC {item.ruc} · Contacto: {item.contact_person} · Tel. {item.phone} ·{" "}
              <a href={`mailto:${item.email}`}>{item.email}</a>
            </p>
          </div>
          <div className="actions">
            <details className="lead-details">
              <summary className="button quiet small">Ver</summary>
              <dl className="lead-facts">
                <dt>Nombre del negocio</dt>
                <dd>{item.business_name}</dd>
                <dt>Razón social</dt>
                <dd>{item.legal_name}</dd>
                <dt>RUC</dt>
                <dd>{item.ruc}</dd>
                <dt>Persona de contacto</dt>
                <dd>{item.contact_person}</dd>
                <dt>Teléfono</dt>
                <dd>{item.phone}</dd>
                <dt>Correo</dt>
                <dd><a href={`mailto:${item.email}`}>{item.email}</a></dd>
                <dt>Recibida</dt>
                <dd>{new Date(item.created_at).toLocaleString("es-PA")}</dd>
                <dt>Estado</dt>
                <dd>{STATUS_LABELS[item.status] ?? item.status}</dd>
              </dl>
            </details>
            {item.status !== "contactado" && (
              <form action={setLeadStatusAction}>
                <input type="hidden" name="lead_id" value={item.id} />
                <input type="hidden" name="status" value="contactado" />
                <Button type="submit" tone="secondary" className="small">Marcar como contactada</Button>
              </form>
            )}
            <form action={deleteLeadAction}>
              <input type="hidden" name="lead_id" value={item.id} />
              <ConfirmSubmit tone="danger" className="small" confirm={{
                title: `¿Eliminar la solicitud de ${item.business_name}?`,
                body: "Se borra la solicitud y sus datos de contacto. No se puede deshacer.",
                confirmLabel: "Eliminar",
                danger: true,
              }}>
                Eliminar solicitud
              </ConfirmSubmit>
            </form>
            {item.status !== "nuevo" && (
              <form action={setLeadStatusAction}>
                <input type="hidden" name="lead_id" value={item.id} />
                <input type="hidden" name="status" value="nuevo" />
                <Button type="submit" tone="quiet" className="small">Volver a nuevas</Button>
              </form>
            )}
          </div>
        </article>
      ))}
      {!rows.length && (
        <p className="muted">{all.length ? "No hay solicitudes en este filtro." : "Aún no hay solicitudes."}</p>
      )}
    </>
  );
}
