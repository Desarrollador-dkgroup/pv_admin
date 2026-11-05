import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { formatDate } from "@/lib/panel-format";
import { loadOwnerPlanUsage } from "@/lib/panel-service-plan";
import { REVIEW_STATUS, SERVICE_STATUS, ownerStateOf, statusOf } from "@/lib/panel-labels";
import { publishOwnServiceAction } from "@/app/panel/actions";
import { related } from "@/lib/panel-relations";
import { canManageCatalog } from "@/types/panel";

type Row = {
  id: string;
  name: string;
  status: string | null;
  review_status: string | null;
  category_id: string;
  updated_at: string;
  businesses: { name: string } | { name: string }[] | null;
};

// Filtros de estado de la lista (clave de la URL → condición).
const FILTERS: Array<{ key: string; label: string; match: (row: Row) => boolean }> = [
  { key: "", label: "Todos", match: () => true },
  { key: "publicados", label: "Publicados", match: (row) => row.status === "published" },
  { key: "borradores", label: "Borradores", match: (row) => row.status === "draft" },
  { key: "pendientes", label: "Pendientes", match: (row) => row.review_status === "pending" },
  { key: "devueltos", label: "Devueltos", match: (row) => row.review_status === "rejected" },
  { key: "suspendidos", label: "Suspendidos", match: (row) => row.status === "suspended" },
];

// Lista servicios dentro del alcance del equipo o del propietario, con filtros y búsqueda.
export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; categoria?: string; q?: string }>;
}) {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "collaborator") redirect("/panel");
  const isStaff = canManageCatalog(role);
  const { estado = "", categoria = "", q = "" } = await searchParams;

  // Sin negocio asignado, el propietario no tiene servicios que consultar.
  if (!isStaff && !businessIds.length) {
    return (
      <>
        <PageHeader title="Mis servicios" />
        <div className="callout warning" role="alert">
          <strong>Sin negocio asignado</strong>
          <span>La cuenta no tiene un negocio asignado.</span>
        </div>
      </>
    );
  }

  const planUsage = !isStaff && businessIds[0]
    ? await loadOwnerPlanUsage(supabase, businessIds[0])
    : [];

  let query = supabase
    .from("services")
    .select("id, name, status, review_status, category_id, updated_at, businesses(name)")
    .order("updated_at", { ascending: false });
  if (!isStaff) query = query.in("business_id", businessIds);

  const [{ data, error }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);
  if (error) throw new Error("No se pudo consultar la lista de servicios.");

  const categoryLabels = new Map((categories ?? []).map((item) => [item.id, item.label]));
  const all = (data ?? []) as unknown as Row[];
  const filter = FILTERS.find((item) => item.key === estado) ?? FILTERS[0];
  const term = q.trim().toLowerCase();
  const rows = all.filter((row) => filter.match(row)
    && (!categoria || row.category_id === categoria)
    && (!term || row.name.toLowerCase().includes(term)
      || (related(row.businesses)?.name ?? "").toLowerCase().includes(term)));
  const params = (next: Record<string, string>) => {
    const search = new URLSearchParams({ estado, categoria, q, ...next });
    for (const [key, value] of [...search.entries()]) if (!value) search.delete(key);
    const text = search.toString();
    return text ? `/panel/servicios?${text}` : "/panel/servicios";
  };

  return (
    <>
      <PageHeader
        title={isStaff ? "Servicios" : "Mis servicios"}
        description={isStaff
          ? "Todas las fichas del catálogo. Filtra por estado o revisión y entra a editar."
          : "Crea, edita y publica los servicios de tu negocio."}
        actions={<Link href="/panel/servicios/nuevo" className="button primary">+ Crear servicio</Link>}
      />
      {!isStaff && (
        <Panel>
          <div>
            <h2>Disponibles en tu plan</h2>
            <p className="muted">Para ampliar tu plan escribe al equipo de Panamá Viajero.</p>
          </div>
          <div className="plan-grid">
            {planUsage.map((item) => (
              <div className="plan-card" key={`${item.category_id}-${item.hospedaje_type_id ?? ""}`}>
                <b>{item.type_label ?? item.category_label}</b>
                <span className="progress">
                  <span style={{ width: `${item.quantity ? (item.used / item.quantity) * 100 : 0}%` }} />
                </span>
                <small>{item.remaining} disponibles de {item.quantity} · {item.used} creados</small>
              </div>
            ))}
          </div>
          {!planUsage.length && <p className="muted">Tu plan aún no tiene servicios asignados.</p>}
        </Panel>
      )}
      <div className="toolbar">
        <nav className="chip-row" aria-label="Filtrar por estado">
          {FILTERS.map((item) => (
            <Link key={item.key} href={params({ estado: item.key })}
              className={`chip ${item.key === filter.key ? "active" : ""}`}>
              {item.label} <span>{all.filter(item.match).length}</span>
            </Link>
          ))}
        </nav>
        <form className="search-form" role="search">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <select name="categoria" defaultValue={categoria} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {(categories ?? []).map((category) => (
              <option key={category.id} value={category.id}>{category.label}</option>
            ))}
          </select>
          <input name="q" defaultValue={q} placeholder="Buscar servicio o negocio"
            aria-label="Buscar servicio o negocio" />
          <button type="submit" className="button secondary small">Filtrar</button>
        </form>
      </div>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                {isStaff && <th>Negocio</th>}
                {isStaff ? (
                  <>
                    <th>Publicación</th>
                    <th>Revisión</th>
                  </>
                ) : (
                  <th>Estado</th>
                )}
                <th>Actualizado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((service) => {
                const status = statusOf(SERVICE_STATUS, service.status);
                const review = statusOf(REVIEW_STATUS, service.review_status);
                const ownerState = ownerStateOf(service);
                return (
                  <tr key={service.id}>
                    <td>
                      <b>{service.name}</b>
                      <small className="table-subtitle">
                        {categoryLabels.get(service.category_id) ?? service.category_id}
                      </small>
                    </td>
                    {isStaff && <td>{related(service.businesses)?.name ?? "—"}</td>}
                    {isStaff ? (
                      <>
                        <td><Badge tone={status.tone}>{status.label}</Badge></td>
                        <td><Badge tone={review.tone}>{review.label}</Badge></td>
                      </>
                    ) : (
                      <td><Badge tone={ownerState.tone}>{ownerState.label}</Badge></td>
                    )}
                    <td>{formatDate(service.updated_at)}</td>
                    <td>
                      <div className="actions">
                        <Link className="button secondary small" href={`/panel/servicios/${service.id}`}>
                          {service.review_status === "rejected" && !isStaff ? "Ver correcciones" : "Editar"}
                        </Link>
                        <Link className="button quiet small"
                          href={`/panel/servicios/${service.id}/vista-previa`}>
                          Vista previa
                        </Link>
                        {!isStaff && service.review_status === "approved" &&
                          service.status !== "published" && (
                          <form action={publishOwnServiceAction}>
                            <input type="hidden" name="service_id" value={service.id} />
                            <button className="button primary small" type="submit">Publicar</button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="muted">No hay servicios para este filtro.</p>}
      </Panel>
    </>
  );
}
