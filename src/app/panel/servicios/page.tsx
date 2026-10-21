import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { loadOwnerPlanUsage } from "@/lib/panel-service-plan";
import { REVIEW_STATUS, SERVICE_STATUS, ownerStateOf, statusOf } from "@/lib/panel-labels";
import { publishOwnServiceAction } from "@/app/panel/actions";
import { related } from "@/lib/panel-relations";
import { canManageCatalog } from "@/types/panel";

// Lista servicios de Supabase dentro del alcance del equipo o del propietario.
export default async function ServicesPage() {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "collaborator") redirect("/panel");
  const isStaff = canManageCatalog(role);

  // Sin negocio asignado, el propietario no tiene servicios que consultar.
  if (!isStaff && !businessIds.length) {
    return (
      <Panel>
        <h1>Mis servicios</h1>
        <p role="alert">La cuenta no tiene un negocio asignado.</p>
      </Panel>
    );
  }

  const planUsage = !isStaff && businessIds[0]
    ? await loadOwnerPlanUsage(supabase, businessIds[0])
    : [];

  let query = supabase
    .from("services")
    .select("id, name, status, review_status, category_id, businesses(name)")
    .order("updated_at", { ascending: false });
  if (!isStaff) query = query.in("business_id", businessIds);

  const [{ data, error }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);
  if (error) throw new Error("No se pudo consultar la lista de servicios.");

  const categoryLabels = new Map((categories ?? []).map((item) => [item.id, item.label]));

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{isStaff ? "Servicios" : "Mis servicios"}</h1>
          <p>Los cambios se guardan en la base de datos compartida.</p>
        </div>
        <Link href="/panel/servicios/nuevo" className="button primary">
          + Crear servicio
        </Link>
      </header>
      {!isStaff && (
        <Panel>
          <h2>Disponibles para añadir</h2>
          {planUsage.map((item) => (
            <div className="queue-item" key={`${item.category_id}-${item.hospedaje_type_id ?? ""}`}>
              <b>{item.type_label ?? item.category_label}</b>
              <small>
                {item.remaining} disponibles de {item.quantity} · {item.used} creados
              </small>
            </div>
          ))}
          {!planUsage.length && <p className="muted">Tu plan aún no tiene servicios asignados.</p>}
        </Panel>
      )}
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Tipo</th>
                {isStaff && <th>Negocio</th>}
                {isStaff ? (
                  <>
                    <th>Estado</th>
                    <th>Revisión</th>
                  </>
                ) : (
                  <th>Estado</th>
                )}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((service) => {
                const status = statusOf(SERVICE_STATUS, service.status);
                const review = statusOf(REVIEW_STATUS, service.review_status);
                const ownerState = ownerStateOf(service);
                return (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>{categoryLabels.get(service.category_id) ?? service.category_id}</td>
                    {isStaff && <td>{related(service.businesses)?.name ?? "—"}</td>}
                    {isStaff ? (
                      <>
                        <td><Badge tone={status.tone}>{status.label}</Badge></td>
                        <td><Badge tone={review.tone}>{review.label}</Badge></td>
                      </>
                    ) : (
                      <td><Badge tone={ownerState.tone}>{ownerState.label}</Badge></td>
                    )}
                    <td>
                      <Link className="button secondary" href={`/panel/servicios/${service.id}`}>
                        Editar
                      </Link>
                      {!isStaff && service.review_status === "approved" &&
                        service.status !== "published" && (
                        <form action={publishOwnServiceAction} style={{ display: "inline" }}>
                          <input type="hidden" name="service_id" value={service.id} />
                          <button className="button primary" type="submit">Publicar</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data?.length && <p className="muted">No hay servicios disponibles para mostrar.</p>}
      </Panel>
    </>
  );
}
