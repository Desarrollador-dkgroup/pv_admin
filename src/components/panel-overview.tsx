import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge, Panel } from "@/components/ui";
import { formatCents, formatDate, formatDateTime } from "@/lib/panel-format";
import { REVIEW_STATUS, SERVICE_STATUS, statusOf } from "@/lib/panel-labels";
import { related } from "@/lib/panel-relations";
import { ROLE_LABELS, type PanelRole } from "@/types/panel";

// Forma mínima del resultado de un conteo de Supabase.
type CountResult = PromiseLike<{ count: number | null; error: { message: string } | null }>;

// Ejecuta un conteo real y devuelve cero solo cuando la tabla no tiene filas que coincidan.
async function countOf(query: CountResult) {
  const { count, error } = await query;
  if (error) throw new Error("No se pudo calcular un indicador del panel.");
  return count ?? 0;
}

// Tarjeta de indicador; si recibe enlace, toda la tarjeta lleva a su sección.
function Metric({ label, value, hint, href }: {
  label: string;
  value: number;
  hint: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </>
  );
  return href ? (
    <Link href={href} className="panel metric-card">{content}</Link>
  ) : (
    <Panel className="metric-card">{content}</Panel>
  );
}

// Encabezado de bienvenida con el rol validado en Supabase.
function Greeting({ role, title, text }: { role: PanelRole; title: string; text: string }) {
  return (
    <header className="hero-card">
      <div>
        <span className="eyebrow">{ROLE_LABELS[role]}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <span className="hero-date">{formatDate(new Date().toISOString())}</span>
    </header>
  );
}

// Resumen del equipo interno: indicadores reales y cola de revisión.
export async function StaffOverview({
  supabase,
  role,
}: {
  supabase: SupabaseClient;
  role: PanelRole;
}) {
  const nowIso = new Date().toISOString();
  const [published, drafts, pending, businesses, suspended, promotions, sites] =
    await Promise.all([
      countOf(supabase.from("services").select("id", { count: "exact", head: true })
        .eq("status", "published")),
      countOf(supabase.from("services").select("id", { count: "exact", head: true })
        .eq("status", "draft")),
      countOf(supabase.from("services").select("id", { count: "exact", head: true })
        .eq("review_status", "pending")),
      countOf(supabase.from("businesses").select("id", { count: "exact", head: true })
        .eq("is_active", true)),
      countOf(supabase.from("blocked_users").select("user_id", { count: "exact", head: true })),
      countOf(supabase.from("promotions").select("id", { count: "exact", head: true })
        .eq("is_published", true)
        .gte("valid_to", nowIso)),
      countOf(supabase.from("tourist_sites").select("id", { count: "exact", head: true })),
    ]);

  // Últimos servicios pendientes para atender desde la portada.
  const { data: queue } = await supabase
    .from("services")
    .select("id, name, businesses(name), updated_at")
    .eq("review_status", "pending")
    .order("updated_at", { ascending: false })
    .limit(5);

  return (
    <>
      <Greeting
        role={role}
        title="Resumen de Panamá Viajero"
        text="Indicadores reales del catálogo, la revisión y las cuentas."
      />
      <div className="metrics">
        <Metric label="Servicios publicados" value={published} hint="Visibles en la web"
          href="/panel/servicios" />
        <Metric label="Pendientes de revisión" value={pending} hint="Enviados por negocios"
          href="/panel/revision" />
        <Metric label="Borradores" value={drafts} hint="Aún no publicados"
          href="/panel/servicios" />
        <Metric label="Negocios activos" value={businesses} hint="Con acceso habilitado"
          href="/panel/negocios" />
        <Metric label="Promociones vigentes" value={promotions} hint="Publicadas y dentro de fecha"
          href="/panel/promociones" />
        <Metric label="Sitios turísticos" value={sites} hint="Destinos disponibles"
          href="/panel/sitios" />
        <Metric label="Cuentas suspendidas" value={suspended} hint="Propietarios sin acceso"
          href="/panel/propietarios?estado=suspendidos" />
      </div>
      <div className="dashboard-grid">
        <Panel>
          <div className="section-heading">
            <h2>Cola de revisión</h2>
            <Link className="text-link" href="/panel/revision">Ver todas</Link>
          </div>
          {(queue ?? []).map((service) => (
            <Link className="queue-item" href="/panel/revision" key={service.id}>
              <b>{service.name}</b>
              <small>
                {related(service.businesses)?.name ?? "Negocio sin nombre"} · enviado{" "}
                {formatDateTime(service.updated_at)}
              </small>
            </Link>
          ))}
          {!queue?.length && <p className="muted">No hay servicios pendientes de revisión.</p>}
        </Panel>
        <Panel>
          <h2>Accesos rápidos</h2>
          <nav className="quick-links">
            <Link className="button secondary" href="/panel/servicios/nuevo">
              Crear servicio
            </Link>
            <Link className="button secondary" href="/panel/promociones/nuevo">
              Crear promoción
            </Link>
            <Link className="button secondary" href="/panel/negocios">
              Administrar negocios
            </Link>
            <Link className="button secondary" href="/panel/permisos">
              Equipo y permisos
            </Link>
          </nav>
        </Panel>
      </div>
    </>
  );
}

// Resumen del colaborador: propietarios y negocios que requieren seguimiento.
export async function CollaboratorOverview({ supabase }: { supabase: SupabaseClient }) {
  const [owners, businesses, blocked] = await Promise.all([
    supabase.from("business_members").select("business_id, user_id").eq("role", "owner"),
    supabase.from("businesses").select("id, name, is_active").order("name"),
    supabase.from("blocked_users").select("user_id"),
  ]);
  if (owners.error || businesses.error || blocked.error) {
    throw new Error("No se pudo cargar el resumen de propietarios.");
  }

  // Cuenta propietarios únicos; una misma cuenta puede administrar varios negocios.
  const ownerIds = new Set(owners.data.map((row) => row.user_id));
  const blockedIds = new Set(blocked.data.map((row) => row.user_id));
  const suspendedOwners = [...ownerIds].filter((id) => blockedIds.has(id)).length;
  const withOwner = new Set(owners.data.map((row) => row.business_id));
  const withoutOwner = businesses.data.filter((business) => !withOwner.has(business.id));

  return (
    <>
      <Greeting
        role="collaborator"
        title="Propietarios y negocios"
        text="Administra quién tiene acceso a cada negocio. Los permisos de equipo son de admins."
      />
      <div className="metrics three">
        <Metric label="Propietarios activos" value={ownerIds.size - suspendedOwners}
          hint="Con acceso habilitado" href="/panel/propietarios" />
        <Metric label="Propietarios suspendidos" value={suspendedOwners}
          hint="Sin acceso al panel" href="/panel/propietarios?estado=suspendidos" />
        <Metric label="Negocios registrados" value={businesses.data.length}
          hint={`${withoutOwner.length} sin propietario asignado`} href="/panel/negocios" />
      </div>
      <Panel>
        <div className="section-heading">
          <h2>Negocios sin propietario</h2>
          <Link className="text-link" href="/panel/negocios">Ver negocios</Link>
        </div>
        {withoutOwner.slice(0, 6).map((business) => (
          <Link className="queue-item" href={`/panel/negocios/${business.id}`} key={business.id}>
            <b>{business.name}</b>
            <small>{business.is_active ? "Activo" : "Inactivo"} · asignar propietario</small>
          </Link>
        ))}
        {!withoutOwner.length && (
          <p className="muted">Todos los negocios tienen un propietario asignado.</p>
        )}
      </Panel>
    </>
  );
}

// Resumen del propietario de negocio: solo servicios y promociones de sus negocios.
export async function OwnerOverview({
  supabase,
  businessIds,
}: {
  supabase: SupabaseClient;
  businessIds: string[];
}) {
  // Sin negocio asignado no hay consultas que hacer; se informa directamente.
  if (!businessIds.length) {
    return (
      <>
        <Greeting role="propietario" title="Tu panel" text="Tu cuenta aún no tiene establecimientos." />
        <p role="alert">La cuenta no tiene establecimientos asignados. Consulta con el equipo.</p>
      </>
    );
  }

  const nowIso = new Date().toISOString();
  const [businesses, services, promotions] = await Promise.all([
    supabase.from("businesses").select("id, name, is_active, cities(name)").in("id", businessIds),
    supabase
      .from("services")
      .select("id, business_id, category_id, name, status, review_status, base_price_cents, updated_at")
      .in("business_id", businessIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("promotions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true)
      .gte("valid_to", nowIso),
  ]);
  if (businesses.error || services.error) {
    throw new Error("No se pudo cargar la información de tus establecimientos.");
  }

  const list = services.data;
  const published = list.filter((service) => service.status === "published").length;
  const inReview = list.filter((service) => service.review_status === "pending").length;
  const changes = list.filter((service) => service.review_status === "rejected").length;

  return (
    <>
      <Greeting
        role="propietario"
        title="Tus establecimientos en Panamá Viajero"
        text="Revisa el estado de tus servicios y mantén la información al día."
      />
      <div className="metrics three">
        <Metric label="Servicios publicados" value={published} hint="Visibles en la web"
          href="/panel/servicios" />
        <Metric label="En revisión" value={inReview} hint="Esperando al equipo"
          href="/panel/servicios" />
        <Metric label="Con cambios solicitados" value={changes} hint="Revisa el comentario"
          href="/panel/notificaciones" />
      </div>
      <Panel>
        <div className="section-heading">
          <h2>Establecimientos asignados</h2>
          <Link className="text-link" href="/panel/negocios">Ver todos</Link>
        </div>
        {(businesses.data ?? []).map((business) => {
          const assigned = list.filter((service) => service.business_id === business.id);
          return (
            <div className="queue-item" key={business.id}>
              <b>{business.name}</b>
              <small>
                {related(business.cities)?.name ?? "Sin ciudad"} · {assigned.length} servicios
              </small>
              <div className="actions">
                <Link className="button secondary" href={`/panel/negocios/${business.id}`}>
                  Ver establecimiento
                </Link>
                {assigned.map((service) => (
                  <Link className="button quiet" href={`/panel/servicios/${service.id}`}
                    key={service.id}>
                    Editar {service.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </Panel>
      <div className="dashboard-grid">
        <Panel>
          <div className="section-heading">
            <h2>Mis servicios recientes</h2>
            <Link className="text-link" href="/panel/servicios">Ver todos</Link>
          </div>
          {list.slice(0, 5).map((service) => {
            const status = statusOf(SERVICE_STATUS, service.status);
            const review = statusOf(REVIEW_STATUS, service.review_status);
            return (
              <Link className="queue-item" href={`/panel/servicios/${service.id}`} key={service.id}>
                <b>{service.name}</b>
                <small>
                  <Badge tone={status.tone}>{status.label}</Badge>{" "}
                  <Badge tone={review.tone}>{review.label}</Badge>
                  {" · desde "}{formatCents(service.base_price_cents)}
                </small>
              </Link>
            );
          })}
          {!list.length && <p className="muted">Aún no tienes servicios registrados.</p>}
        </Panel>
        <Panel>
          <h2>Mis establecimientos</h2>
          {(businesses.data ?? []).map((business) => (
            <div className="queue-item" key={business.id}>
              <b>{business.name}</b>
              <small>
                {business.is_active ? "Activo" : "Inactivo"} ·{" "}
                {related(business.cities)?.name ?? "Sin ciudad"}
              </small>
            </div>
          ))}
          <p className="muted">
            Promociones vigentes publicadas: {promotions.count ?? 0}. Las gestiona el equipo.
          </p>
          <p className="muted">
            Panamá Viajero asigna los establecimientos y servicios de esta cuenta.
          </p>
        </Panel>
      </div>
    </>
  );
}
