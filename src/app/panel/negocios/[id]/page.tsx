import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Panel } from "@/components/ui";
import { MemberAddForm } from "@/components/panel-member-form";
import { OwnBusinessForm } from "@/components/panel-own-business-form";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageProviders } from "@/lib/panel-permissions";
import { getAccountNames } from "@/lib/panel-people";
import { related } from "@/lib/panel-relations";
import { canManageCatalog } from "@/types/panel";
import {
  removeBusinessMemberAction,
  setBusinessActiveAction,
} from "../actions";

// Muestra un negocio con sus miembros, servicios y acciones permitidas al rol actual.
export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role, businessIds } = await getPanelIdentity();

  // Un propietario solo puede abrir negocios que tiene asignados.
  if (role === "propietario" && !businessIds.includes(id)) notFound();

  const { data: business, error } = await supabase
    .from("businesses")
    .select("id, name, description, city_id, is_active, cities(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el negocio.");
  if (!business) notFound();

  const [membersResult, servicesResult, accountsResult, plansResult, citiesResult] =
    await Promise.all([
    supabase
      .from("business_members")
      .select("user_id, role")
      .eq("business_id", id)
      .order("role"),
    supabase
      .from("services")
      .select("id, name, status, review_status, category_id")
      .eq("business_id", id)
      .order("name"),
    canManageProviders(role)
      ? supabase.from("profiles").select("id, display_name").order("display_name").limit(300)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("business_service_plans")
      .select("id, quantity, categories(label), hospedaje_types(label)")
      .eq("business_id", id)
      .order("created_at"),
    supabase.from("cities").select("id, name").order("name"),
  ]);
  if (
    membersResult.error || servicesResult.error || accountsResult.error ||
    plansResult.error || citiesResult.error
  ) {
    throw new Error("No se pudo cargar la información del negocio.");
  }

  const members = membersResult.data ?? [];
  const names = await getAccountNames(supabase, members.map((member) => member.user_id));
  const memberIds = new Set(members.map((member) => member.user_id));
  // Solo se ofrecen cuentas que todavía no pertenecen a este negocio.
  const availableAccounts = (accountsResult.data ?? [])
    .filter((account) => !memberIds.has(account.id))
    .map((account) => ({ id: account.id, name: account.display_name }));
  const canEditStatus = canManageCatalog(role);

  return (
    <>
      <header className="page-heading">
        <div>
          <Link className="text-link" href="/panel/negocios">← Negocios</Link>
          <h1>{business.name}</h1>
          <p>
            {related(business.cities)?.name ?? "Sin ciudad"} ·{" "}
            {business.description ?? "Sin descripción"}
          </p>
        </div>
        <Badge>{business.is_active ? "Activo" : "Inactivo"}</Badge>
      </header>

      {role === "propietario" && (
        <Panel>
          <h2>Datos del negocio</h2>
          <p className="muted">Completa la información que verán los visitantes.</p>
          <OwnBusinessForm
            businessId={id}
            name={business.name}
            description={business.description ?? ""}
            cityId={business.city_id}
            cities={citiesResult.data ?? []}
          />
        </Panel>
      )}

      <div className="dashboard-grid">
        <Panel>
          <h2>Personas con acceso</h2>
          {members.map((member) => (
            <div className="member-row" key={member.user_id}>
              <div>
                <b>{names.get(member.user_id) ?? "Cuenta sin perfil"}</b>
                <small>{member.role === "owner" ? "Propietario" : "Colaborador del negocio"}</small>
              </div>
              {canManageProviders(role) && (
                <form action={removeBusinessMemberAction}>
                  <input type="hidden" name="business_id" value={id} />
                  <input type="hidden" name="user_id" value={member.user_id} />
                  <Button tone="quiet" type="submit">Quitar</Button>
                </form>
              )}
            </div>
          ))}
          {!members.length && (
            <p className="muted">Este negocio aún no tiene personas asignadas.</p>
          )}
          {canManageProviders(role) && (
            <MemberAddForm businessId={id} accounts={availableAccounts} />
          )}
        </Panel>

        <Panel>
          <h2>Estado del negocio</h2>
          {canEditStatus ? (
            <form action={setBusinessActiveAction}>
              <input type="hidden" name="business_id" value={id} />
              <label className="checkbox-option">
                <input type="checkbox" name="is_active" defaultChecked={business.is_active} />
                Negocio activo
              </label>
              <Button tone="secondary" type="submit">Guardar estado</Button>
            </form>
          ) : (
            <p className="muted">
              {business.is_active
                ? "El negocio está activo en la plataforma."
                : "El negocio está inactivo en la plataforma."}
            </p>
          )}
        </Panel>
      </div>

      <Panel>
        <h2>Plan de servicios</h2>
        {(plansResult.data ?? []).map((plan) => {
          const category = related(plan.categories);
          const lodging = related(plan.hospedaje_types);
          return (
            <div className="member-row" key={plan.id}>
              <b>{plan.quantity} × {category?.label ?? "Servicio"}</b>
              {lodging && <small>{lodging.label}</small>}
            </div>
          );
        })}
        {!plansResult.data?.length && (
          <p className="muted">No hay un plan de servicios registrado para este negocio.</p>
        )}
      </Panel>

      <Panel>
        <div className="section-heading">
          <h2>Servicios del negocio</h2>
          <Link className="text-link" href="/panel/servicios">Ver servicios</Link>
        </div>
        {(servicesResult.data ?? []).map((service) => (
          <div className="queue-item" key={service.id}>
            <b>{service.name}</b>
            <small>{service.category_id} · {service.status} · {service.review_status}</small>
            <div className="actions">
              <Link className="button secondary" href={`/panel/servicios/${service.id}`}>
                Editar ficha y ubicación
              </Link>
              <Link className="button quiet" href={`/panel/servicios/${service.id}/galeria`}>
                Fotos del establecimiento y habitaciones
              </Link>
              {service.category_id === "hospedaje" && (
                <Link className="button quiet" href={`/panel/servicios/${service.id}/unidades`}>
                  Habitaciones y tarifas
                </Link>
              )}
              {service.category_id === "restaurantes" && (
                <Link className="button quiet" href={`/panel/servicios/${service.id}/menu`}>
                  Menú
                </Link>
              )}
            </div>
          </div>
        ))}
        {!servicesResult.data?.length && (
          <p className="muted">No hay servicios registrados.</p>
        )}
      </Panel>
    </>
  );
}
