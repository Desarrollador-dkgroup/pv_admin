import Link from "next/link";
import { Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { capitalize } from "@/lib/panel-format";

// Lista los sitios turísticos con su país, provincia destino y nombre.
export default async function TouristSitesPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const { data, error } = await supabase
    .from("tourist_sites")
    .select("id, name, province_id, sort_order")
    .order("sort_order")
    .order("name");
  if (error) throw new Error("No se pudieron cargar los sitios turísticos.");

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Sitios turísticos</h1>
          <p>Destinos que sirven de referencia para servicios y promociones.</p>
        </div>
        <Link className="button primary" href="/panel/sitios/nuevo">+ Nuevo sitio</Link>
      </header>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>País</th>
                <th>Provincia (destino)</th>
                <th>Nombre del sitio</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((site) => (
                <tr key={site.id}>
                  <td>Panamá</td>
                  <td>{capitalize(site.province_id)}</td>
                  <td>{site.name}</td>
                  <td>
                    <Link className="button secondary" href={`/panel/sitios/${site.id}`}>
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.length && <p className="muted">Aún no hay sitios turísticos registrados.</p>}
      </Panel>
    </>
  );
}
