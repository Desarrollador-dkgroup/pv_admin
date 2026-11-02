import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { contractStatusLabel } from "@/lib/panel-contracts";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Contratos de cada negocio. Solo lo ve el equipo.
export default async function ContractsPage() {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const [{ data: businesses, error }, { data: contracts }] = await Promise.all([
    admin.from("businesses").select("id, name").order("name"),
    admin.from("business_contracts").select("business_id, status, signed_at"),
  ]);
  if (error) throw new Error("No se pudieron cargar los negocios.");

  const byBusiness = new Map((contracts ?? []).map((contract) => [contract.business_id, contract]));
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Contratos</h1>
          <p>Define la comisión, el límite de descuento y el tope de cada negocio, y prepara el documento para imprimir.</p>
        </div>
      </header>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(businesses ?? []).map((business) => {
                const contract = byBusiness.get(business.id);
                return (
                  <tr key={business.id}>
                    <td><b>{business.name}</b></td>
                    <td>
                      <Badge>{contract ? contractStatusLabel(contract.status) : "Sin contrato"}</Badge>
                    </td>
                    <td>
                      <div className="actions">
                        <Link className="button secondary" href={`/panel/contratos/${business.id}`}>
                          {contract ? "Editar" : "Crear contrato"}
                        </Link>
                        {contract && (
                          <Link className="button quiet" href={`/panel/contratos/${business.id}/imprimir`}>
                            Imprimir
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
