import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, ConfirmSubmit, PageHeader, Panel } from "@/components/ui";
import { BusinessStatusEditor } from "@/components/business-status-editor";
import { ServicePlanAddForm } from "@/components/panel-service-plan-form";
import { OwnBusinessForm } from "@/components/panel-own-business-form";
import { getPanelIdentity } from "@/lib/panel-access";
import { contractStatusLabel, contractStatusTone } from "@/lib/panel-contracts";
import { formatCents } from "@/lib/panel-format";
import { ownerStateOf } from "@/lib/panel-labels";
import { canManageProviders } from "@/lib/panel-permissions";
import { PlanAddServiceForm } from "@/components/panel-plan-add-service-form";
import { related } from "@/lib/panel-relations";
import { canManageCatalog } from "@/types/panel";
import { removeServicePlanCategoryAction, setBusinessActiveAction } from "../actions";

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
  const [members, services, plans, categories, types, contract] = await Promise.all([
    supabase.from("business_members").select("user_id, role").eq("business_id", id).order("role"),
    supabase
      .from("services")
      .select("id, name, status, review_status, category_id, hospedaje_type_id, base_price_cents")
      .eq("business_id", id)
      .order("name"),
    supabase
      .from("business_service_plans")
      .select("id, quantity, category_id, hospedaje_type_id, categories(label), hospedaje_types(label)")
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
  if (members.error || services.error || plans.error || categories.error || types.error) {
    throw new Error("No se pudo cargar la información del negocio.");
  }

  const memberList = members.data ?? [];
  const labelOf = new Map((categories.data ?? []).map((item) => [item.id, item.label]));
  const serviceList = services.data ?? [];
  const usedOf = (categoryId: string) =>
    serviceList.filter((service) => service.category_id === categoryId).length;
  const hasOwner = memberList.some((member) => member.role === "owner");
  // Plan agrupado por categoría (las líneas de hospedaje guardan su tipo).
  type PlanLine = NonNullable<typeof plans.data>[number];
  const planGroups = Object.values((plans.data ?? []).reduce<Record<string, {
    categoryId: string; label: string; quantity: number; free: number; lines: PlanLine[];
  }>>((acc, plan) => {
    const group = acc[plan.category_id] ?? {
      categoryId: plan.category_id,
      label: related(plan.categories)?.label ?? labelOf.get(plan.category_id) ?? "Servicio",
      quantity: 0,
      free: 0,
      lines: [],
    };
    group.quantity += plan.quantity;
    group.lines.push(plan);
    acc[plan.category_id] = group;
    return acc;
  }, {}));
  // Disponibles para crear: por cada tipo, cupo menos servicios ya creados (nunca negativo).
  for (const group of planGroups) {
    const quotaByType = new Map<string | null, number>();
    for (const line of group.lines) {
      const key = line.hospedaje_type_id ?? null;
      quotaByType.set(key, (quotaByType.get(key) ?? 0) + line.quantity);
    }
    group.free = [...quotaByType].reduce((sum, [typeId, quota]) => sum + Math.max(0, quota
      - serviceList.filter((service) => service.category_id === group.categoryId
        && (service.hospedaje_type_id ?? null) === typeId).length), 0);
  }

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
          <OwnBusinessForm businessId={id} name={business.name} />
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
              // Galería, habitaciones y menú viven dentro de la ficha (pestañas).
              const canEditService = isStaff || role === "propietario";
              return (
                <div className="list-row" key={service.id}>
                  <div className="list-row-text">
                    <Link href={canEditService
                      ? `/panel/servicios/${service.id}`
                      : `/panel/servicios/${service.id}/vista-previa`}>
                      <b>{service.name}</b>
                    </Link>
                    <small>
                      {labelOf.get(service.category_id) ?? service.category_id}
                      {service.base_price_cents ? ` · desde ${formatCents(service.base_price_cents)}` : ""}
                    </small>
                  </div>
                  <Badge tone={state.tone}>{state.label}</Badge>
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
            {planGroups.map((group) => (
              <div className="list-row" key={group.categoryId}>
                <div className="list-row-text">
                  <b>{group.label}</b>
                  <small>
                    {group.quantity} en el plan · {usedOf(group.categoryId)} creados ·{" "}
                    <b>{group.free} {group.free === 1 ? "disponible" : "disponibles"} para crear</b>
                  </small>
                </div>
                {isTeam && (
                  <PlanAddServiceForm businessId={id} categoryId={group.categoryId}
                    categoryLabel={group.label}
                    types={group.categoryId === "hospedaje" ? (types.data ?? []) : []} />
                )}
                {isTeam && (
                  <form action={removeServicePlanCategoryAction}>
                    <input type="hidden" name="business_id" value={id} />
                    <input type="hidden" name="category_id" value={group.categoryId} />
                    <ConfirmSubmit tone="quiet" className="small" confirm={{
                      title: `¿Quitar ${group.label} del plan?`,
                      body: "Se quitan todos los cupos de esta categoría. Los servicios ya creados no se borran.",
                      confirmLabel: "Quitar del plan",
                      danger: true,
                    }}>
                      Quitar
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            ))}
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
            <div className="section-heading">
              <h2>Estado del negocio</h2>
              <Badge tone={business.is_active ? "success" : "neutral"}>
                {business.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>
            {isStaff ? (
              <BusinessStatusEditor businessId={id} isActive={business.is_active}
                action={setBusinessActiveAction} />
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
