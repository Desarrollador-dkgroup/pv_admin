import Link from "next/link";
import { Badge, Button, Panel } from "@/components/ui";
import { CreateTeamAccountForm } from "@/components/panel-team-forms";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { assignableTeamRoles, canManageAccount } from "@/lib/panel-permissions";
import { getAccountProfiles } from "@/lib/panel-people";
import { getOrphanAccounts, type OrphanAccount } from "@/lib/panel-team";
import { formatDate } from "@/lib/panel-format";
import { ROLE_LABELS, type PanelRole } from "@/types/panel";

// Filtros del equipo. "Todos" es el inicial.
const FILTERS = [
  { value: "todos", label: "Todos" },
  { value: "admin", label: "Administradores" },
  { value: "collaborator", label: "Colaboradores" },
] as const;
type FilterValue = (typeof FILTERS)[number]["value"];

type SearchParams = Promise<{ q?: string; rol?: string }>;

// Fila de la tabla: cuenta con rol de equipo, o cuenta creada desde el panel sin rol.
type Row = {
  userId: string;
  role: PanelRole | null;
  date: string | null;
  name: string;
  email: string;
};

// Equipo interno: búsqueda por nombre o correo, filtro por rol y gestión según la matriz.
export default async function PermissionsPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, role, user } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "collaborator"]);

  // El colaborador no administra el equipo; solo ve sus alcances.
  if (role === "collaborator") {
    return (
      <>
        <header className="page-heading">
          <div>
            <h1>Permisos</h1>
            <p>Lo que puedes hacer con tu rol de colaborador.</p>
          </div>
        </header>
        <Panel>
          <h2>Tus permisos</h2>
          <ul className="permission-list">
            <li>Asignar y quitar propietarios y colaboradores de cada negocio.</li>
            <li>Suspender o reactivar el acceso de propietarios de negocio.</li>
            <li>Ver negocios y estados. No administras cuentas internas ni el catálogo.</li>
          </ul>
          <Link className="button secondary" href="/panel/propietarios">
            Administrar propietarios
          </Link>
        </Panel>
      </>
    );
  }

  // Lee el filtro y la búsqueda de la URL; valores desconocidos vuelven al inicial.
  const { q = "", rol = "todos" } = await searchParams;
  const filter: FilterValue = FILTERS.some((item) => item.value === rol)
    ? (rol as FilterValue)
    : "todos";
  const term = q.trim().toLowerCase();

  const { data: team, error } = await supabase
    .from("platform_admins")
    .select("user_id, platform_role, granted_at");
  if (error) throw new Error("No se pudo cargar el equipo de Panamá Viajero.");

  const members = team ?? [];
  // Cuentas creadas desde el panel que quedaron sin rol. Si falta la clave de servidor,
  // la lista muestra solo el equipo.
  let orphans: OrphanAccount[] = [];
  try {
    orphans = await getOrphanAccounts(members.map((member) => member.user_id));
  } catch {
    orphans = [];
  }

  const profiles = await getAccountProfiles(supabase, [
    ...members.map((member) => member.user_id),
    ...orphans.map((orphan) => orphan.userId),
  ]);

  const rows: Row[] = [
    ...members.map((member) => {
      const profile = profiles.get(member.user_id);
      return {
        userId: member.user_id,
        role: member.platform_role as PanelRole,
        date: member.granted_at,
        name: profile?.name ?? "Cuenta sin nombre",
        email: profile?.email ?? "Sin correo registrado",
      };
    }),
    ...orphans.map((orphan) => {
      const profile = profiles.get(orphan.userId);
      return {
        userId: orphan.userId,
        role: null,
        date: orphan.createdAt,
        name: profile?.name ?? "Cuenta sin nombre",
        email: profile?.email ?? (orphan.email || "Sin correo registrado"),
      };
    }),
  ]
    .filter((row) => filter === "todos" || row.role === filter)
    .filter((row) =>
      !term || row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term))
    .sort((a, b) => a.name.localeCompare(b.name));

  const searchHref = (value: FilterValue) =>
    `/panel/permisos?rol=${value}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const roles = assignableTeamRoles(role);

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Permisos</h1>
          <p>Equipo interno de Panamá Viajero y los roles que cada cuenta puede administrar.</p>
        </div>
        <Badge>{ROLE_LABELS[role]}</Badge>
      </header>

      <div className="team-toolbar">
        <form action="/panel/permisos" method="get" className="search-field" role="search">
          <input type="hidden" name="rol" value={filter} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o correo"
            aria-label="Buscar por nombre o correo"
          />
          <Button tone="secondary" type="submit">Buscar</Button>
        </form>
        <nav className="chip-filter" aria-label="Filtrar por rol">
          {FILTERS.map((item) => (
            <Link
              key={item.value}
              className={filter === item.value ? "chip active" : "chip"}
              href={searchHref(item.value)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Desde</th>
                <th>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const effective: PanelRole = row.role ?? "collaborator";
                const canOpen = canManageAccount(role, effective) && row.role !== "owner";
                return (
                  <tr key={row.userId}>
                    <td>
                      <span className="table-name">{row.name}</span>
                      {row.userId === user.id && (
                        <small className="table-subtitle">Tu cuenta</small>
                      )}
                    </td>
                    <td>{row.email}</td>
                    <td>
                      {row.role ? (
                        <Badge>{ROLE_LABELS[row.role]}</Badge>
                      ) : (
                        <Badge tone="warning">Sin rol de equipo</Badge>
                      )}
                    </td>
                    <td>{row.date ? formatDate(row.date) : "—"}</td>
                    <td className="manage-cell">
                      {row.role === "owner" && <small className="muted">Protegida</small>}
                      {canOpen && (
                        <Link className="button secondary" href={`/panel/permisos/${row.userId}`}>
                          Editar
                        </Link>
                      )}
                      {!canOpen && row.role !== "owner" && (
                        <small className="muted">Sin permiso para esta cuenta</small>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="muted">No hay cuentas que coincidan con la búsqueda.</p>}
      </Panel>

      {roles.length > 0 && (
        <Panel>
          <h2>Agregar usuario al equipo</h2>
          <p className="muted">
            Escribe el correo, el nombre y el rol. Genera la contraseña temporal y entrégala
            junto con el correo para que la persona pueda entrar.
          </p>
          <CreateTeamAccountForm roles={roles} />
        </Panel>
      )}

      
    </>
  );
}
