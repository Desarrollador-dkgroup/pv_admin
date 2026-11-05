import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, ConfirmSubmit, PageHeader, Panel } from "@/components/ui";
import { MemberAddForm } from "@/components/panel-member-form";
import { ServicePlanAddForm } from "@/components/panel-service-plan-form";
import { OwnBusinessForm } from "@/components/panel-own-business-form";
import { getPanelIdentity } from "@/lib/panel-access";
import { contractStatusLabel, contractStatusTone } from "@/lib/panel-contracts";
import { formatCents } from "@/lib/panel-format";
import { ownerStateOf } from "@/lib/panel-labels";
import { canManageProviders } from "@/lib/panel-permissions";
import { getAccountNames } from "@/lib/panel-people";
import { related } from "@/lib/panel-relations";
import { canManageCatalog } from "@/types/panel";
import {
  removeBusinessMemberAction,
  removeServicePlanAction,
  setBusinessActiveAction,
} from "../actions";

// Muestra un negocio con sus servicios, plan, personas, estado y contrato según el rol.
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
    .select("id, name, description, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("No se pudo cargar el negocio.");
  if (!business) notFound();

  const isStaff = canManageCatalog(role);
  const isTeam = canManageProviders(role);
  const [members, services, accounts, plans, categories, types, contract] = await Promise.all([
    supabase.from("business_members").select("user_id, role").eq("business_id", id).order("role"),
    supabase
      .from("services")
      .select("id, name, status, review_status, category_id, base_price_cents")
      .eq("business_id", id)
      .order("name"),
    isTeam
      ? supabase.from("profiles").select("id, display_name").order("display_name").limit(300)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("business_service_plans")
      .select("id, quantity, category_id, categories(label), hospedaje_types(label)")
      .eq("business_id", id)
      .order("created_at"),
    supabase.from("categories").select("id, label").order("label"),
    supabase.from("hospedaje_types").select("id, label").order("label"),
    isStaff
      ? supabase.from("business_contracts")
        .select("status, base_commission_pct, discount_limit_pct, commission_cap_pct, target_profit_cents")
        .eq("business_id", id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (members.error || services.error || accounts.error || plans.error || categories.error
    || types.error) {
    throw new Error("No se pudo cargar la información del negocio.");
  }

  const memberList = members.data ?? [];
  const names = await getAccountNames(supabase, memberList.map((member) => member.user_id));
  const memberIds = new Set(memberList.map((member) => member.user_id));
  const availableAccounts = (accounts.data ?? [])
    .filter((account) => !memberIds.has(account.id))
    .map((account) => ({ id: account.id, name: account.display_name }));
  const labelOf = new Map((categories.data ?? []).map((item) => [item.id, item.label]));
  const serviceList = services.data ?? [];
  const usedOf = (categoryId: string) =>
    serviceList.filter((service) => service.category_id === categoryId).length;
  const hasOwner = memberList.some((member) => member.role === "owner");

  return (
    <>
      <PageHeader
        back={{ href: "/panel/negocios", label: "Negocios" }}
        title={business.name}
        description={business.description ?? "Sin descripción"}
        actions={
          <>
            <Badge tone={business.is_active ? "success" : "neutral"}>
              {business.is_active ? "Activo" : "Inactivo"}
            </Badge>
            {isStaff && (
              <Link className="button secondary" href={`/panel/contratos/${id}`}>Ver contrato</Link>
            )}
          </>
        }
      />

      {isTeam && !hasOwner && (
        <div className="callout warning">
          <strong>Este negocio no tiene propietario</strong>
          <span>Asigna una cuenta para que pueda entrar al panel y completar sus servicios.</span>
        </div>
      )}

      {role === "propietario" && (
        <Panel>
          <h2>Datos del negocio</h2>
          <p className="muted">Completa la información que verán los visitantes.</p>
          <OwnBusinessForm businessId={id} name={business.name}
            description={business.description ?? ""} />
        </Panel>
      )}

      <div className="split wide-side">
        <div className="stack">
          <Panel>
            <div className="section-heading">
              <div>
                <h2>Servicios del negocio</h2>
                <p className="muted">
                  {serviceList.length} {serviceList.length === 1 ? "servicio registrado" : "servicios registrados"}
                </p>
              </div>
              {isStaff && <Link className="text-link" href="/panel/servicios">Ver servicios ›</Link>}
            </div>
            {serviceList.map((service) => {
              const state = ownerStateOf(service);
              return (
                <div className="list-row" key={service.id}>
                  <div className="list-row-text">
                    <b>{service.name}</b>
                    <small>
                      {labelOf.get(service.category_id) ?? service.category_id}
                      {service.base_price_cents ? ` · desde ${formatCents(service.base_price_cents)}` : ""}
                    </small>
                  </div>
                  <Badge tone={state.tone}>{state.label}</Badge>
                  <div className="actions">
                    {isStaff || role === "propietario" ? (
                      <>
                        <Link className="button secondary small" href={`/panel/servicios/${service.id}`}>
                          Editar ficha
                        </Link>
                        <Link className="button quiet small" href={`/panel/servicios/${service.id}/galeria`}>
                          Galería
                        </Link>
                        {service.category_id === "hospedaje" && (
                          <Link className="button quiet small"
                            href={`/panel/servicios/${service.id}?seccion=habitaciones`}>
                            Habitaciones
                          </Link>
                        )}
                        {service.category_id === "restaurantes" && (
                          <Link className="button quiet small" href={`/panel/servicios/${service.id}/menu`}>
                            Menú
                          </Link>
                        )}
                      </>
                    ) : (
                      <Link className="button secondary small"
                        href={`/panel/servicios/${service.id}/vista-previa`}>
                        Vista previa
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
            {!serviceList.length && <p className="muted">No hay servicios registrados.</p>}
          </Panel>

          <Panel>
            <div>
              <h2>Plan de servicios</h2>
              <p className="muted">Cuántos servicios de cada tipo puede crear el negocio.</p>
            </div>
            {(plans.data ?? []).map((plan) => {
              const category = related(plan.categories);
              const lodging = related(plan.hospedaje_types);
              return (
                <div className="list-row" key={plan.id}>
                  <span className="badge tone-info">{plan.quantity} ×</span>
                  <div className="list-row-text">
                    <b>{category?.label ?? "Servicio"}{lodging ? ` · ${lodging.label}` : ""}</b>
                    <small>{usedOf(plan.category_id)} creados</small>
                  </div>
                  {isTeam && (
                    <form action={removeServicePlanAction}>
                      <input type="hidden" name="business_id" value={id} />
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <ConfirmSubmit tone="quiet" className="small" confirm={{
                        title: `¿Quitar ${plan.quantity} × ${category?.label ?? "servicio"} del plan?`,
                        body: "Los servicios ya creados no se borran, pero el negocio no podrá crear más de este tipo.",
                        confirmLabel: "Quitar del plan",
                        danger: true,
                      }}>
                        Quitar
                      </ConfirmSubmit>
                    </form>
                  )}
                </div>
              );
            })}
            {!plans.data?.length && (
              <p className="muted">No hay un plan de servicios registrado para este negocio.</p>
            )}
            {isTeam && (
              <ServicePlanAddForm businessId={id} categories={categories.data ?? []}
                lodgingTypes={types.data ?? []} />
            )}
          </Panel>
        </div>

        <div className="stack">
          <Panel>
            <h2>Personas con acceso</h2>
            {memberList.map((member) => (
              <div className="list-row" key={member.user_id}>
                <div className="list-row-text">
                  <b>{names.get(member.user_id) ?? "Cuenta sin perfil"}</b>
                  <small>{member.role === "owner" ? "Propietario" : "Colaborador del negocio"}</small>
                </div>
                {isTeam && (
                  <form action={removeBusinessMemberAction}>
                    <input type="hidden" name="business_id" value={id} />
                    <input type="hidden" name="user_id" value={member.user_id} />
                    <ConfirmSubmit tone="quiet" className="small" confirm={{
                      title: `¿Quitar a ${names.get(member.user_id) ?? "esta persona"} del negocio?`,
                      body: "Perderá el acceso a este negocio. Su cuenta no se borra.",
                      confirmLabel: "Quitar",
                      danger: true,
                    }}>
                      Quitar
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            ))}
            {!memberList.length && <p className="muted">Este negocio aún no tiene personas asignadas.</p>}
            {isTeam && <MemberAddForm businessId={id} accounts={availableAccounts} />}
          </Panel>

          <Panel>
            <h2>Estado del negocio</h2>
            {isStaff ? (
              <form action={setBusinessActiveAction} className="stack compact">
                <input type="hidden" name="business_id" value={id} />
                <label className="checkbox-option">
                  <input type="checkbox" name="is_active" defaultChecked={business.is_active} />
                  Negocio activo
                </label>
                <small className="muted">Si lo desactivas, sus servicios dejan de verse en la web.</small>
                <Button tone="secondary" type="submit">Guardar estado</Button>
              </form>
            ) : (
              <p className="muted">
                {business.is_active
                  ? "El negocio está activo en la plataforma. Solo un administrador puede cambiarlo."
                  : "El negocio está inactivo en la plataforma. Solo un administrador puede cambiarlo."}
              </p>
            )}
          </Panel>

          {isStaff && (
            <Panel>
              <div className="section-heading">
                <h2>Contrato</h2>
                <Link className="text-link" href={`/panel/contratos/${id}`}>Abrir ›</Link>
              </div>
              {contract.data ? (
                <>
                  <Badge tone={contractStatusTone(contract.data.status)}>
                    {contractStatusLabel(contract.data.status)}
                  </Badge>
                  <dl className="kv">
                    <dt>Comisión base</dt><dd>{Number(contract.data.base_commission_pct)} %</dd>
                    <dt>Límite de descuento</dt><dd>{Number(contract.data.discount_limit_pct)} %</dd>
                    <dt>Tope de comisión</dt><dd>{Number(contract.data.commission_cap_pct)} %</dd>
                  </dl>
                </>
              ) : (
                <>
                  <Badge tone="warning">Sin contrato</Badge>
                  <Link className="button secondary" href={`/panel/contratos/${id}`}>Crear contrato</Link>
                </>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
