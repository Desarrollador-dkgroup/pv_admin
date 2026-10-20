import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { getAccountNames } from "@/lib/panel-people";
import { related } from "@/lib/panel-relations";

type SearchParams = Promise<{ categoria?: string }>;

// Lista negocios con su propietario, categorías y estado; el propietario ve solo los suyos.
export default async function BusinessesPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "propietario" && !businessIds.length) {
    return <Panel><p role="alert">La cuenta no tiene establecimientos asignados.</p></Panel>;
  }
  const { categoria = "" } = await searchParams;
  const isStaff = role !== "propietario";

  // Cada consulta se limita al alcance del rol; el filtro de categoría se aplica después.
  let query = supabase
    .from("businesses")
    .select(
      "id, name, is_active, cities(name), business_members(user_id, role), services(category_id)",
    )
    .order("name");
  if (!isStaff) query = query.in("id", businessIds);

  const [{ data: businesses, error }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);
  if (error) throw new Error("No se pudieron cargar los negocios.");

  // Nombres de propietarios: se leen en un solo paso para evitar una consulta por negocio.
  const ownerIds = [...new Set((businesses ?? []).flatMap((business) =>
    (business.business_members ?? [])
      .filter((member) => member.role === "owner")
      .map((member) => member.user_id)))];
  const names = await getAccountNames(supabase, ownerIds);

  const rows = (businesses ?? []).filter((business) =>
    !categoria || business.services.some((service) => service.category_id === categoria));

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{isStaff ? "Negocios" : "Mis establecimientos"}</h1>
          <p>
            {isStaff
              ? "Negocios registrados, sus propietarios y el tipo de servicios que ofrecen."
              : "Tus establecimientos, servicios y las personas que tienen acceso."}
          </p>
        </div>
      </header>

      {isStaff && (
        <nav className="chip-filter" aria-label="Filtrar por categoría">
          <Link className={!categoria ? "chip active" : "chip"} href="/panel/negocios">
            Todas
          </Link>
          {(categories ?? []).map((category) => (
            <Link
              key={category.id}
              className={categoria === category.id ? "chip active" : "chip"}
              href={`/panel/negocios?categoria=${category.id}`}
            >
              {category.label}
            </Link>
          ))}
        </nav>
      )}

      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Negocio</th>
                <th>Propietario</th>
                <th>Categorías</th>
                <th>Ciudad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((business) => {
                const owner = business.business_members.find((member) => member.role === "owner");
                const categoriesOfBusiness = [
                  ...new Set(business.services.map((service) => service.category_id)),
                ];
                return (
                  <tr key={business.id}>
                    <td>{business.name}</td>
                    <td>{owner ? names.get(owner.user_id) ?? "Sin nombre" : "Sin propietario"}</td>
                    <td>{categoriesOfBusiness.join(", ") || "Sin servicios"}</td>
                    <td>{related(business.cities)?.name ?? "—"}</td>
                    <td>
                      <Badge>{business.is_active ? "Activo" : "Inactivo"}</Badge>
                    </td>
                    <td>
                      <Link className="button secondary" href={`/panel/negocios/${business.id}`}>
                        Administrar
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
