import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageCatalog } from "@/types/panel";

// Lista servicios de Supabase dentro del alcance del administrador o propietario.
export default async function ServicesPage() {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "collaborator") redirect("/panel/permisos");
  const isStaff = canManageCatalog(role);
  let query = supabase
    .from("services")
    .select(
      "id, name, status, review_status, category_id, businesses(name), cities(name)",
    )
    .order("updated_at", { ascending: false });

  if (!isStaff) query = query.in("business_id", businessIds);

  const [{ data, error }, { data: membership }] = await Promise.all([
    query,
    !isStaff
      ? supabase
          .from("business_members")
          .select("business_id, businesses(name)")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      : Promise.resolve({ data: [] }),
  ]);

  if (error) throw new Error("No se pudo consultar la lista de servicios.");

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
      {!isStaff && membership?.length === 0 && (
        <Panel>
          <p>La cuenta no tiene un negocio asignado.</p>
        </Panel>
      )}
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Tipo</th>
                <th>Negocio</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Revisión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((service) => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{service.category_id}</td>
                  <td>{service.businesses?.[0]?.name ?? "—"}</td>
                  <td>{service.cities?.[0]?.name ?? "—"}</td>
                  <td>
                    <Badge>{service.status}</Badge>
                  </td>
                  <td><Badge>{service.review_status}</Badge></td>
                  <td>
                    <Link
                      className="button secondary"
                      href={`/panel/servicios/${service.id}`}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.length && <p>No hay servicios disponibles para mostrar.</p>}
      </Panel>
    </>
  );
}
