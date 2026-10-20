import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { CreateOwnerForm } from "@/components/panel-owner-form";
import { PersonNameForm } from "@/components/panel-person-name-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { canEditName, canManageProviders } from "@/lib/panel-permissions";
import { OwnerActions } from "@/components/panel-owner-actions";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Estados que puede mostrar la lista. Activos es el filtro inicial.
const FILTERS = [
  { value: "activos", label: "Activos" },
  { value: "suspendidos", label: "Suspendidos" },
  { value: "todos", label: "Todos" },
] as const;
type FilterValue = (typeof FILTERS)[number]["value"];

type SearchParams = Promise<{ estado?: string }>;

// Lista a los propietarios de negocio con sus negocios, su estado y su nombre editable.
export default async function OwnersPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "collaborator"]);

  // Cualquier valor no reconocido vuelve al filtro inicial de activos.
  const { estado } = await searchParams;
  const filter: FilterValue = FILTERS.some((item) => item.value === estado)
    ? (estado as FilterValue)
    : "activos";

  const admin = getSupabaseAdminClient();
  const [
    accounts, team, profiles, memberships, blocked, businesses, categories, lodgingTypes,
  ] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("platform_admins").select("user_id"),
      admin.from("profiles").select("id, display_name"),
      admin.from("business_members").select("business_id, user_id").eq("role", "owner"),
      admin.from("blocked_users").select("user_id"),
      admin.from("businesses").select("id, name").order("name"),
      supabase.from("categories").select("id, label").order("sort_order"),
      supabase.from("hospedaje_types").select("id, label").order("sort_order"),
    ]);
  if (
    accounts.error || team.error || profiles.error || memberships.error ||
    blocked.error || businesses.error || categories.error || lodgingTypes.error
  ) {
    throw new Error("No se pudo cargar la lista de propietarios.");
  }

  // Toda cuenta que no es del equipo es propietaria, tenga o no negocio asignado.
  const teamIds = new Set((team.data ?? []).map((row) => row.user_id));
  const accountList = accounts.data?.users ?? [];
  const emailOf = new Map(accountList.map((account) => [account.id, account.email ?? ""]));
  const profileNames = new Map(
    (profiles.data ?? []).map((row) => [row.id, row.display_name ?? ""]),
  );
  const businessNames = new Map((businesses.data ?? []).map((item) => [item.id, item.name]));
  const byOwner = new Map<string, string[]>();
  for (const account of accountList) {
    if (!teamIds.has(account.id)) byOwner.set(account.id, []);
  }
  for (const row of memberships.data ?? []) {
    const list = byOwner.get(row.user_id);
    if (list) list.push(businessNames.get(row.business_id) ?? "Negocio");
  }
  const blockedIds = new Set((blocked.data ?? []).map((row) => row.user_id));
  const nameOf = (id: string) => profileNames.get(id) || emailOf.get(id) || "Cuenta sin nombre";

  const activeCount = [...byOwner.keys()].filter((id) => !blockedIds.has(id)).length;
  const suspendedCount = byOwner.size - activeCount;
  const rows = [...byOwner.entries()]
    .filter(([id]) => {
      if (filter === "activos") return !blockedIds.has(id);
      if (filter === "suspendidos") return blockedIds.has(id);
      return true;
    })
    .sort(([a], [b]) => nameOf(a).localeCompare(nameOf(b)));
  const canManage = canManageProviders(role);
  const canRename = canEditName(role, "propietario");

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Propietarios</h1>
          <p>
            Cuentas de propietarios. Suspender bloquea su acceso al panel;
            borrar elimina la cuenta.
          </p>
        </div>
        {canManageProviders(role) && (
          <a className="button primary" href="#agregar-propietario">+ Agregar propietario</a>
        )}
      </header>

      <nav className="chip-filter" aria-label="Filtrar por estado">
        {FILTERS.map((item) => {
          const count = item.value === "activos" ? activeCount
            : item.value === "suspendidos" ? suspendedCount
              : byOwner.size;
          return (
            <Link
              key={item.value}
              className={filter === item.value ? "chip active" : "chip"}
              href={`/panel/propietarios?estado=${item.value}`}
            >
              {item.label} <span>{count}</span>
            </Link>
          );
        })}
      </nav>

      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Propietario</th>
                <th>Negocios</th>
                <th>Estado</th>
                {canManage && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(([id, businessList]) => {
                const suspended = blockedIds.has(id);
                return (
                  <tr key={id}>
                    <td>
                      {canRename ? (
                        <PersonNameForm userId={id} name={nameOf(id)} />
                      ) : (
                        nameOf(id)
                      )}
                    </td>
                    <td>{businessList.length ? businessList.join(", ") : "Sin negocio"}</td>
                    <td><Badge tone={suspended ? "danger" : "success"}>
                      {suspended ? "Suspendido" : "Activo"}
                    </Badge></td>
                    {canManage && (
                      <td>
                        <OwnerActions userId={id} name={nameOf(id)} suspended={suspended} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="muted">No hay propietarios para este filtro.</p>}
      </Panel>

      {canManageProviders(role) && (
        <section id="agregar-propietario">
          <Panel>
            <h2>Agregar propietario</h2>
            <p className="muted">
              Crea la cuenta con una contraseña temporal y asígnala como propietario de un negocio.
            </p>
            <CreateOwnerForm
              categories={categories.data ?? []}
              lodgingTypes={lodgingTypes.data ?? []}
            />
          </Panel>
        </section>
      )}
    </>
  );
}
