import Link from "next/link";
import { Badge, Metric, PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { contractStatusLabel, contractStatusTone } from "@/lib/panel-contracts";
import { formatCents, formatDate } from "@/lib/panel-format";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type Row = {
  business_id: string;
  status: string;
  base_commission_pct: number;
  discount_limit_pct: number;
  commission_cap_pct: number;
  target_profit_cents: number;
  issued_at: string | null;
  signed_at: string | null;
  verified_at: string | null;
  version: number;
};

// Filtros de la lista: clave de la URL → estado del contrato («sin» = sin contrato).
const FILTERS = [
  { key: "", label: "Todos", match: () => true },
  { key: "sin", label: "Sin contrato", match: (status?: string) => !status },
  { key: "borradores", label: "Borradores", match: (status?: string) => status === "draft" },
  { key: "esperando", label: "Esperando firma", match: (status?: string) => status === "issued" },
  { key: "verificar", label: "Por verificar", match: (status?: string) => status === "submitted" },
  { key: "vigentes", label: "Vigentes", match: (status?: string) => status === "signed" },
  { key: "anulados", label: "Anulados", match: (status?: string) => status === "void" },
];

// Acción principal según el estado del contrato.
function primaryAction(status?: string) {
  if (!status) return { label: "Crear contrato", tone: "primary" };
  if (status === "draft") return { label: "Continuar", tone: "secondary" };
  if (status === "submitted") return { label: "Verificar firma", tone: "primary" };
  return { label: "Ver contrato", tone: "secondary" };
}

// Contratos de cada negocio. Solo lo ve el equipo.
export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);
  const { estado = "", q = "" } = await searchParams;

  const admin = getSupabaseAdminClient();
  const [{ data: businesses, error }, { data: contracts }] = await Promise.all([
    admin.from("businesses").select("id, name, is_active").order("name"),
    admin.from("business_contracts").select(
      "business_id, status, base_commission_pct, discount_limit_pct, commission_cap_pct, " +
        "target_profit_cents, issued_at, signed_at, verified_at, version",
    ),
  ]);
  if (error) throw new Error("No se pudieron cargar los negocios.");

  const byBusiness = new Map(
    ((contracts ?? []) as unknown as Row[]).map((contract) => [contract.business_id, contract]),
  );
  const list = (businesses ?? []).map((business) => ({
    business,
    contract: byBusiness.get(business.id),
  }));
  const count = (key: string) =>
    list.filter((item) => FILTERS.find((f) => f.key === key)?.match(item.contract?.status)).length;
  const filter = FILTERS.find((item) => item.key === estado) ?? FILTERS[0];
  const term = q.trim().toLowerCase();
  const visible = list.filter((item) => filter.match(item.contract?.status)
    && (!term || item.business.name.toLowerCase().includes(term)));

  return (
    <>
      <PageHeader
        title="Contratos"
        description="Define las condiciones de cada negocio, emite el documento y verifica la copia firmada."
      />
      <div className="metrics five">
        <Metric label="Sin contrato" value={count("sin")} hint="Negocios sin documento"
          href="/panel/contratos?estado=sin" />
        <Metric label="Borradores" value={count("borradores")} hint="No visibles para el negocio"
          href="/panel/contratos?estado=borradores" />
        <Metric label="Esperando firma" value={count("esperando")} hint="Emitidos, sin copia firmada"
          href="/panel/contratos?estado=esperando" />
        <Metric label="Por verificar" value={count("verificar")} hint="Copia firmada subida"
          href="/panel/contratos?estado=verificar" />
        <Metric label="Vigentes" value={count("vigentes")} hint="Firmados y verificados"
          href="/panel/contratos?estado=vigentes" />
      </div>
      <div className="toolbar">
        <nav className="chip-row" aria-label="Filtrar por estado">
          {FILTERS.map((item) => (
            <Link key={item.key} href={item.key ? `/panel/contratos?estado=${item.key}` : "/panel/contratos"}
              className={`chip ${item.key === filter.key ? "active" : ""}`}>
              {item.label} <span>{count(item.key)}</span>
            </Link>
          ))}
        </nav>
        <form className="search-form" role="search">
          {estado && <input type="hidden" name="estado" value={estado} />}
          <input name="q" defaultValue={q} placeholder="Buscar negocio" aria-label="Buscar negocio" />
        </form>
      </div>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Estado</th>
                <th>Condiciones</th>
                <th>Emitido</th>
                <th>Firma</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ business, contract }) => {
                const action = primaryAction(contract?.status);
                return (
                  <tr key={business.id}>
                    <td>
                      <b>{business.name}</b>
                      {contract && <small className="table-subtitle">Versión {contract.version}</small>}
                    </td>
                    <td>
                      {contract
                        ? <Badge tone={contractStatusTone(contract.status)}>
                          {contractStatusLabel(contract.status)}
                        </Badge>
                        : <Badge tone="warning">Sin contrato</Badge>}
                    </td>
                    <td>
                      {contract ? (
                        <>
                          {Number(contract.base_commission_pct)} % · {Number(contract.discount_limit_pct)} % ·{" "}
                          {Number(contract.commission_cap_pct)} %
                          <small className="table-subtitle">
                            base · límite · tope · {formatCents(Number(contract.target_profit_cents))}
                          </small>
                        </>
                      ) : "—"}
                    </td>
                    <td>{contract?.issued_at ? formatDate(contract.issued_at) : "—"}</td>
                    <td>
                      {contract?.verified_at
                        ? `Verificado ${formatDate(contract.verified_at)}`
                        : contract?.signed_at && contract.status === "submitted"
                          ? `Subido ${formatDate(contract.signed_at)}`
                          : "—"}
                    </td>
                    <td>
                      <div className="actions">
                        <Link className={`button ${action.tone} small`}
                          href={`/panel/contratos/${business.id}`}>
                          {action.label}
                        </Link>
                        {contract && contract.status !== "draft" && (
                          <Link className="button quiet small"
                            href={`/panel/contratos/${business.id}/imprimir`}>
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
        {!visible.length && <p className="muted">No hay negocios para este filtro.</p>}
      </Panel>
    </>
  );
}
