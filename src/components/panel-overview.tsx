import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge, Metric, PageHeader, Panel } from "@/components/ui";
import { OwnBusinessForm } from "@/components/panel-own-business-form";
import { loadCategoryLabels } from "@/lib/panel-categories";
import { contractStatusLabel, contractStatusTone } from "@/lib/panel-contracts";
import { formatCents, formatDate, formatDateTime } from "@/lib/panel-format";
import { ownerStateOf } from "@/lib/panel-labels";
import { related } from "@/lib/panel-relations";
import type { PanelRole } from "@/types/panel";

// Forma mínima del resultado de un conteo de Supabase.
type CountResult = PromiseLike<{ count: number | null; error: { message: string } | null }>;

// Ejecuta un conteo real; si falla, el indicador muestra cero en lugar de romper la portada.
async function countOf(query: CountResult) {
  const { count } = await query;
  return count ?? 0;
}

// Fecha de hoy en Panamá (YYYY-MM-DD) para comparar con columnas de tipo date.
function todayIso() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Panama" }).format(new Date());
}

// Iniciales para el avatar de una fila.
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("")
    .toUpperCase();
}

// Fila de la cola de revisión.
function QueueRow({ name, detail, href, action = "Revisar" }: {
  name: string;
  detail: string;
  href: string;
  action?: string;
}) {
  return (
    <div className="list-row">
      <span className="avatar" aria-hidden="true">{initials(name)}</span>
      <div className="list-row-text">
        <b>{name}</b>
        <small>{detail}</small>
      </div>
      <Badge tone="warning">Pendiente</Badge>
      <Link className="button secondary small" href={href}>{action}</Link>
    </div>
  );
}

// Aviso con título y detalle; enlaza a la sección que lo resuelve.
function Notice({ title, detail, tone, href }: {
  title: string;
  detail: string;
  tone: "danger" | "warning" | "info" | "success";
  href: string;
}) {
  return (
    <Link href={href} className={`callout ${tone}`}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </Link>
  );
}

// Resumen del equipo interno (owner y admin): indicadores reales y cola de revisión.
export async function StaffOverview({
  supabase,
}: {
  supabase: SupabaseClient;
  role: PanelRole;
}) {
  const today = todayIso();
  const [
    published, drafts, pending, businesses, suspended, promotions, destinations, sites,
    contractsIssued, contractsSubmitted, suggestions,
  ] = await Promise.all([
    countOf(supabase.from("services").select("id", { count: "exact", head: true })
      .eq("status", "published")),
    countOf(supabase.from("services").select("id", { count: "exact", head: true })
      .eq("status", "draft")),
    countOf(supabase.from("services").select("id", { count: "exact", head: true })
      .eq("review_status", "pending")),
    countOf(supabase.from("businesses").select("id", { count: "exact", head: true })
      .eq("is_active", true)),
    countOf(supabase.from("blocked_users").select("user_id", { count: "exact", head: true })),
    countOf(supabase.from("service_promotions").select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .or(`schedule_mode.eq.weekdays,ends_on.gte.${today}`)),
    countOf(supabase.from("destinations").select("id", { count: "exact", head: true })),
    countOf(supabase.from("tourist_sites").select("id", { count: "exact", head: true })),
    countOf(supabase.from("business_contracts").select("id", { count: "exact", head: true })
      .eq("status", "issued")),
    countOf(supabase.from("business_contracts").select("id", { count: "exact", head: true })
      .eq("status", "submitted")),
    countOf(supabase.from("suggestions").select("id", { count: "exact", head: true })
      .eq("status", "new")),
  ]);

  // Servicios pendientes, los más antiguos primero, para atender desde la portada.
  const [{ data: queue }, categoryOf] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, category_id, businesses(name), updated_at")
      .eq("review_status", "pending")
      .order("updated_at", { ascending: true })
      .limit(5),
    loadCategoryLabels(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Resumen de Panamá Viajero"
        description="Indicadores reales del catálogo, la revisión y las cuentas."
        actions={
          <>
            <span className="badge tone-neutral">{formatDate(new Date().toISOString())}</span>
            <Link className="button primary" href="/panel/servicios/nuevo">+ Crear servicio</Link>
          </>
        }
      />
      <div className="metrics">
        <Metric label="Servicios publicados" value={published} hint="Visibles en la web"
          href="/panel/servicios?estado=publicados" />
        <Metric label="Pendientes de revisión" value={pending} hint="Enviados por negocios"
          href="/panel/revision" />
        <Metric label="Borradores" value={drafts} hint="Aún no publicados"
          href="/panel/servicios?estado=borradores" />
        <Metric label="Negocios activos" value={businesses} hint="Con acceso habilitado"
          href="/panel/negocios" />
        <Metric label="Promociones vigentes" value={promotions} hint="Activas hoy"
          href="/panel/promociones" />
        <Metric label="Destinos" value={destinations} hint={`Con ${sites} sitios turísticos`}
          href="/panel/sitios" />
        <Metric label="Cuentas suspendidas" value={suspended} hint="Propietarios sin acceso"
          href="/panel/propietarios?estado=suspendidos" />
        <Metric label="Contratos por firmar" value={contractsIssued} hint="Emitidos sin firma"
          href="/panel/contratos?estado=esperando" />
      </div>
      <div className="split">
        <Panel>
          <div className="section-heading">
            <div>
              <h2>Cola de revisión</h2>
              <p className="muted">Servicios enviados por los negocios, los más antiguos primero.</p>
            </div>
            <Link className="text-link" href="/panel/revision">Ver todas ›</Link>
          </div>
          {(queue ?? []).map((service) => (
            <QueueRow
              key={service.id}
              name={service.name}
              href={`/panel/revision?servicio=${service.id}`}
              detail={`${related(service.businesses)?.name ?? "Negocio sin nombre"} · ${
                categoryOf(service.category_id)} · enviado ${formatDateTime(service.updated_at)}`}
            />
          ))}
          {!queue?.length && <p className="muted">No hay servicios pendientes de revisión.</p>}
        </Panel>
        <div className="stack">
          <Panel>
            <h2>Accesos rápidos</h2>
            <nav className="quick-links">
              <Link href="/panel/servicios/nuevo">Crear servicio ›</Link>
              <Link href="/panel/promociones/nuevo">Crear promoción ›</Link>
              <Link href="/panel/negocios">Administrar negocios ›</Link>
              <Link href="/panel/permisos">Equipo y permisos ›</Link>
            </nav>
          </Panel>
          <Panel>
            <h2>Requiere atención</h2>
            {suspended > 0 && (
              <Notice tone="danger" href="/panel/propietarios?estado=suspendidos"
                title={`${suspended} ${suspended === 1 ? "cuenta suspendida" : "cuentas suspendidas"}`}
                detail="Revisa si deben recuperar el acceso." />
            )}
            {contractsSubmitted > 0 && (
              <Notice tone="info" href="/panel/contratos?estado=verificar"
                title={`${contractsSubmitted} ${contractsSubmitted === 1
                  ? "copia firmada por verificar" : "copias firmadas por verificar"}`}
                detail="Revisa la firma y activa el contrato." />
            )}
            {contractsIssued > 0 && (
              <Notice tone="warning" href="/panel/contratos?estado=esperando"
                title={`${contractsIssued} ${contractsIssued === 1
                  ? "contrato sin firmar" : "contratos sin firmar"}`}
                detail="Emitidos y esperando la firma del negocio." />
            )}
            {suggestions > 0 && (
              <Notice tone="info" href="/panel/sugerencias"
                title={`${suggestions} ${suggestions === 1 ? "sugerencia nueva" : "sugerencias nuevas"}`}
                detail="Escritas por visitantes de la web." />
            )}
            {!suspended && !contractsSubmitted && !contractsIssued && !suggestions && (
              <p className="muted">Todo está al día.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

// Resumen del colaborador: propietarios, negocios sin propietario y cola de revisión.
export async function CollaboratorOverview({ supabase }: { supabase: SupabaseClient }) {
  const [owners, businesses, blocked, queue, categoryOf] = await Promise.all([
    supabase.from("business_members").select("business_id, user_id").eq("role", "owner"),
    supabase.from("businesses").select("id, name, is_active").order("name"),
    supabase.from("blocked_users").select("user_id"),
    supabase
      .from("services")
      .select("id, name, category_id, updated_at")
      .eq("review_status", "pending")
      .order("updated_at", { ascending: true })
      .limit(5),
    loadCategoryLabels(supabase),
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
  const pending = queue.data ?? [];

  return (
    <>
      <PageHeader
        title="Propietarios y negocios"
        description="Administra quién tiene acceso a cada negocio y revisa los servicios enviados."
        actions={
          <Link className="button primary" href="/panel/propietarios#agregar-propietario">
            + Agregar propietario
          </Link>
        }
      />
      <div className="metrics">
        <Metric label="Propietarios activos" value={ownerIds.size - suspendedOwners}
          hint="Con acceso habilitado" href="/panel/propietarios" />
        <Metric label="Propietarios suspendidos" value={suspendedOwners}
          hint="Sin acceso al panel" href="/panel/propietarios?estado=suspendidos" />
        <Metric label="Negocios registrados" value={businesses.data.length}
          hint={`${withoutOwner.length} sin propietario asignado`} href="/panel/negocios" />
        <Metric label="Pendientes de revisión" value={pending.length}
          hint="Enviados por negocios" href="/panel/revision" />
      </div>
      <div className="dashboard-grid">
        <Panel>
          <div className="section-heading">
            <h2>Negocios sin propietario</h2>
            <Link className="text-link" href="/panel/negocios?filtro=sin-propietario">
              Ver negocios ›
            </Link>
          </div>
          {withoutOwner.slice(0, 6).map((business) => (
            <div className="list-row" key={business.id}>
              <div className="list-row-text">
                <b>{business.name}</b>
                <small>{business.is_active ? "Activo" : "Inactivo"} · sin propietario</small>
              </div>
              <Link className="button secondary small" href={`/panel/negocios/${business.id}`}>
                Asignar propietario
              </Link>
            </div>
          ))}
          {!withoutOwner.length && (
            <p className="muted">Todos los negocios tienen un propietario asignado.</p>
          )}
        </Panel>
        <Panel>
          <div className="section-heading">
            <h2>Cola de revisión</h2>
            <Link className="text-link" href="/panel/revision">Ver todas ›</Link>
          </div>
          {pending.map((service) => (
            <QueueRow key={service.id} name={service.name}
              href={`/panel/revision?servicio=${service.id}`}
              detail={`${categoryOf(service.category_id)} · enviado ${
                formatDateTime(service.updated_at)}`} />
          ))}
          {!pending.length && <p className="muted">No hay servicios pendientes de revisión.</p>}
        </Panel>
      </div>
      <div className="callout">
        <strong>Tu rol</strong>
        <span>
          Los permisos del equipo, los contratos, los destinos y la edición de fichas los
          gestionan los administradores.
        </span>
      </div>
    </>
  );
}

// Resumen del propietario de negocio: sus servicios, promociones, negocio y contrato.
export async function OwnerOverview({
  supabase,
  businessIds,
  profileName,
}: {
  supabase: SupabaseClient;
  businessIds: string[];
  profileName?: string;
}) {
  // Sin negocio asignado no hay consultas que hacer; se informa directamente.
  if (!businessIds.length) {
    return (
      <>
        <PageHeader title="Tu panel" description="Tu cuenta aún no tiene un negocio." />
        <div className="callout warning" role="alert">
          <strong>Sin negocio asignado</strong>
          <span>La cuenta no tiene un negocio asignado. Consulta con el equipo.</span>
        </div>
      </>
    );
  }

  const today = todayIso();
  const [businesses, services, promotions, contracts, categoryOf] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, description, is_active")
      .in("id", businessIds),
    supabase
      .from("services")
      .select(
        "id, business_id, category_id, name, status, review_status, review_comment, " +
          "base_price_cents, updated_at",
      )
      .in("business_id", businessIds)
      .order("updated_at", { ascending: false }),
    supabase
      .from("service_promotions")
      .select("id, services!inner(business_id)", { count: "exact", head: true })
      .eq("is_active", true)
      .in("services.business_id", businessIds)
      .or(`schedule_mode.eq.weekdays,ends_on.gte.${today}`),
    supabase
      .from("business_contracts")
      .select("business_id, status, issued_at, rejection_reason")
      .in("business_id", businessIds)
      .neq("status", "draft"),
    loadCategoryLabels(supabase),
  ]);
  if (businesses.error || services.error) {
    throw new Error("No se pudo cargar la información de tus establecimientos.");
  }

  type OwnerService = {
    id: string;
    category_id: string;
    name: string;
    status: string | null;
    review_status: string | null;
    review_comment: string | null;
    base_price_cents: number | null;
  };
  const list = (services.data ?? []) as unknown as OwnerService[];
  const published = list.filter((service) => service.status === "published").length;
  const inReview = list.filter((service) => service.review_status === "pending").length;
  const rejected = list.filter((service) => service.review_status === "rejected");
  const contract = contracts.data?.[0];
  const firstName = profileName?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hola, ${firstName}` : "Tu negocio en Panamá Viajero"}
        description="Revisa el estado de tus servicios y mantén la información de tu negocio al día."
        actions={<Link className="button primary" href="/panel/servicios/nuevo">+ Crear servicio</Link>}
      />
      <div className="metrics">
        <Metric label="Servicios publicados" value={published} hint="Visibles en la web"
          href="/panel/servicios" />
        <Metric label="En revisión" value={inReview} hint="Esperando al equipo"
          href="/panel/servicios" />
        <Metric label="Con cambios solicitados" value={rejected.length}
          hint="Revisa el comentario" href="/panel/notificaciones" />
        <Metric label="Promociones activas" value={promotions.count ?? 0} hint="Hoy en la web"
          href="/panel/promociones" />
      </div>
      {rejected.map((service) => (
        <Link key={service.id} href={`/panel/servicios/${service.id}`} className="callout danger">
          <strong>{service.name} necesita cambios</strong>
          <span>«{service.review_comment ?? "Revisa la ficha y vuelve a enviarla."}»</span>
        </Link>
      ))}
      <div className="split">
        <Panel>
          <div className="section-heading">
            <h2>Mis servicios</h2>
            <Link className="text-link" href="/panel/servicios">Ver todos ›</Link>
          </div>
          {list.slice(0, 6).map((service) => {
            const state = ownerStateOf(service);
            return (
              <div className="list-row" key={service.id}>
                <div className="list-row-text">
                  <b>{service.name}</b>
                  <small>
                    {categoryOf(service.category_id)}
                    {service.base_price_cents ? ` · desde ${formatCents(service.base_price_cents)}` : ""}
                  </small>
                </div>
                <Badge tone={state.tone}>{state.label}</Badge>
                <Link className="button secondary small" href={`/panel/servicios/${service.id}`}>
                  Editar
                </Link>
              </div>
            );
          })}
          {!list.length && <p className="muted">Aún no tienes servicios registrados.</p>}
        </Panel>
        <div className="stack">
          <Panel>
            <h2>Tu negocio</h2>
            <p className="muted">Así lo verán los visitantes.</p>
            {(businesses.data ?? []).map((business) => (
              <div key={business.id} className="stack compact">
                <Badge tone={business.is_active ? "success" : "neutral"}>
                  {business.is_active ? "Activo" : "Inactivo"}
                </Badge>
                <OwnBusinessForm businessId={business.id} name={business.name} />
              </div>
            ))}
          </Panel>
          <Panel>
            <div className="section-heading">
              <h2>Tu contrato</h2>
              <Link className="text-link" href="/panel/mi-contrato">Ver contrato ›</Link>
            </div>
            {contract ? (
              <>
                <Badge tone={contractStatusTone(contract.status)}>
                  {contractStatusLabel(contract.status)}
                </Badge>
                <p className="muted">
                  {contract.status === "issued"
                    ? contract.rejection_reason
                      ? `Tu copia fue rechazada: ${contract.rejection_reason}`
                      : `Emitido el ${formatDate(contract.issued_at)}. Imprímelo, fírmalo y súbelo.`
                    : contract.status === "submitted"
                      ? "El equipo está verificando tu copia firmada."
                      : contract.status === "signed"
                        ? "Tu contrato está vigente."
                        : "El contrato fue anulado. El equipo te enviará uno nuevo."}
                </p>
              </>
            ) : (
              <p className="muted">Aún no tienes un contrato emitido.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
