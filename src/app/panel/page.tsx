import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageCatalog } from "@/types/panel";

// Resume los servicios reales visibles para la cuenta autenticada.
export default async function LivePanel() {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "collaborator") redirect("/panel/permisos");
  const isStaff = canManageCatalog(role);
  let query = supabase
    .from("services")
    .select("id, name, status, category_id, review_status")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!isStaff) query = query.in("business_id", businessIds);

  const { data: services, error } = await query;
  if (error) throw new Error("No se pudieron cargar los servicios de esta cuenta.");

  const records = services ?? [];
  const drafts = records.filter((service) => service.status === "draft").length;
  const published = records.filter((service) => service.status === "published").length;
  const pending = records.filter((service) => service.review_status === "pending").length;

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{isStaff ? "Administración" : "Mi panel"}</h1>
          <p>Información actual de Panamá Viajero desde Supabase.</p>
        </div>
        <Link href="/panel/servicios" className="button primary">
          Ver servicios
        </Link>
      </header>
      <div className="metrics three">
        <Panel>
          <span className="metric-label">Servicios visibles</span>
          <strong>{records.length}</strong>
          <small>Registros accesibles para esta cuenta</small>
        </Panel>
        <Panel>
          <span className="metric-label">Publicados</span>
          <strong>{published}</strong>
          <small>Servicios disponibles en la web</small>
        </Panel>
        <Panel>
          <span className="metric-label">
            {isStaff ? "Pendientes de revisión" : "Borradores"}
          </span>
          <strong>{isStaff ? pending : drafts}</strong>
          <small>
            {isStaff ? "Enviados por los negocios" : "Aún no publicados"}
          </small>
        </Panel>
      </div>
      <Panel>
        <h2>Servicios recientes</h2>
        {records.slice(0, 6).map((service) => (
          <Link
            className="queue-item"
            href={`/panel/servicios/${service.id}`}
            key={service.id}
          >
            <b>{service.name}</b>
            <small>
              {service.category_id} · {service.status}
            </small>
          </Link>
        ))}
        {!records.length && <p>No hay servicios asociados a esta cuenta.</p>}
      </Panel>
      {error && <p role="alert">No se pudieron cargar los servicios.</p>}
    </>
  );
}
