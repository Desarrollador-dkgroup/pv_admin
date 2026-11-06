import Link from "next/link";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { contractStatusLabel, contractStatusTone } from "@/lib/panel-contracts";
import { getAccountNames } from "@/lib/panel-people";
import { canManageCatalog } from "@/types/panel";

type SearchParams = Promise<{ categoria?: string; filtro?: string; q?: string }>;

// Lista negocios con su propietario, categorías, estado y contrato; el propietario ve los suyos.
export default async function BusinessesPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "propietario" && !businessIds.length) {
    return <Panel><p role="alert">La cuenta no tiene establecimientos asignados.</p></Panel>;
  }
  const { categoria = "", filtro = "", q = "" } = await searchParams;
  const isTeam = role !== "propietario";
  const isStaff = canManageCatalog(role);

  // Cada consulta se limita al alcance del rol; los filtros se aplican después.
  let query = supabase
    .from("businesses")
    .select("id, name, is_active, business_members(user_id, role), services(category_id)")
    .order("name");
  if (!isTeam) query = query.in("id", businessIds);

  const [{ data: businesses, error }, { data: categories }, { data: contracts }] = await Promise.all([
    query,
    supabase.from("categories").select("id, label").order("sort_order"),
    isStaff
      ? supabase.from("business_contracts").select("business_id, status")
      : Promise.resolve({ data: [] as Array<{ business_id: string; status: string }> }),
  ]);
  if (error) throw new Error("No se pudieron cargar los negocios.");

  const labelOf = new Map((categories ?? []).map((item) => [item.id, item.label]));
  const contractOf = new Map((contracts ?? []).map((item) => [item.business_id, item.status]));
  const ownerIds = [...new Set((businesses ?? []).flatMap((business) =>
    (business.business_members ?? [])
      .filter((member) => member.role === "owner")
      .map((member) => member.user_id)))];
  const names = await getAccountNames(supabase, ownerIds);

  const all = businesses ?? [];
  const term = q.trim().toLowerCase();
  const withoutOwner = (business: (typeof all)[number]) =>
    !business.business_members.some((member) => member.role === "owner");
  const rows = all.filter((business) =>
    (!categoria || business.services.some((service) => service.category_id === categoria))
    && (filtro !== "sin-propietario" || withoutOwner(business))
    && (!term || business.name.toLowerCase().includes(term)
      || business.business_members.some((member) =>
        (names.get(member.user_id) ?? "").toLowerCase().includes(term))));
  const count = (id: string) =>
    all.filter((business) => business.services.some((service) => service.category_id === id)).length;

  return (
    <>
      <PageHeader
        title={isTeam ? "Negocios" : "Mis establecimientos"}
        description={isTeam
          ? "Negocios registrados, sus propietarios y el tipo de servicios que ofrecen. Se crean al agregar un propietario."
          : "Tus establecimientos, servicios y las personas que tienen acceso."}
        actions={isTeam && (
          <>
            <Link className="button secondary" href="/panel/negocios/nuevo">+ Nuevo negocio</Link>
            <Link className="button primary" href="/panel/propietarios#agregar-propietario">
              + Agregar propietario
            </Link>
          </>
        )}
      />

      {isTeam && (
        <Panel>
          <div className="section-heading">
            <h2>Negocios por categoría</h2>
            <small className="muted">{all.length} negocios en total</small>
          </div>
          {(categories ?? []).map((category) => (
            <div className="list-row" key={category.id}>
              <div className="list-row-text">
                <b>{category.label}</b>
              </div>
              <Badge tone={count(category.id) ? "info" : "neutral"}>
                {count(category.id)} {count(category.id) === 1 ? "negocio" : "negocios"}
              </Badge>
            </div>
          ))}
        </Panel>
      )}

      {isTeam && (
        <div className="toolbar">
          <nav className="chip-row" aria-label="Filtrar negocios">
            <Link className={`chip ${!categoria && !filtro ? "active" : ""}`} href="/panel/negocios">
              Todas <span>{all.length}</span>
            </Link>
            <Link className={`chip ${filtro === "sin-propietario" ? "active" : ""}`}
              href="/panel/negocios?filtro=sin-propietario">
              Sin propietario <span>{all.filter(withoutOwner).length}</span>
            </Link>
            {(categories ?? []).filter((category) => count(category.id)).map((category) => (
              <Link key={category.id}
                className={`chip ${categoria === category.id ? "active" : ""}`}
                href={`/panel/negocios?categoria=${category.id}`}>
                {category.label} <span>{count(category.id)}</span>
              </Link>
            ))}
          </nav>
          <form className="search-form" role="search">
            <input name="q" defaultValue={q} placeholder="Buscar negocio o propietario"
              aria-label="Buscar negocio o propietario" />
          </form>
        </div>
      )}

      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Propietario</th>
                <th>Categorías</th>
                <th>Estado</th>
                {isStaff && <th>Contrato</th>}
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((business) => {
                const owner = business.business_members.find((member) => member.role === "owner");
                const categoryIds = [...new Set(business.services.map((service) => service.category_id))];
                const contract = contractOf.get(business.id);
                return (
                  <tr key={business.id}>
                    <td><b>{business.name}</b></td>
                    <td>
                      {owner
                        ? names.get(owner.user_id) ?? "Sin nombre"
                        : <Badge tone="warning">Sin propietario</Badge>}
                    </td>
                    <td>
                      <div className="chip-row">
                        {categoryIds.map((id) => (
                          <span key={id} className="badge tone-info">{labelOf.get(id) ?? id}</span>
                        ))}
                        {!categoryIds.length && <span className="muted">Sin servicios</span>}
                      </div>
                    </td>
                    <td>
                      <Badge tone={business.is_active ? "success" : "neutral"}>
                        {business.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    {isStaff && (
                      <td>
                        {contract
                          ? <Badge tone={contractStatusTone(contract)}>{contractStatusLabel(contract)}</Badge>
                          : <Badge tone="warning">Sin contrato</Badge>}
                      </td>
                    )}
                    <td>
                      <Link className="button secondary small" href={`/panel/negocios/${business.id}`}>
                        {owner || !isTeam ? "Administrar" : "Asignar propietario"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="muted">No hay negocios para este filtro.</p>}
      </Panel>
    </>
  );
}
