import type { SupabaseClient } from "@supabase/supabase-js";

export type PlanAvailability = {
  category_id: string;
  hospedaje_type_id: string | null;
  quantity: number;
};

// Devuelve los cupos del plan del negocio que todavía tienen servicios libres.
// El plan lo asigna el equipo; el propietario no puede superarlo.
export async function loadOwnerPlanAvailability(
  supabase: SupabaseClient,
  businessId: string,
): Promise<PlanAvailability[]> {
  const [plans, services] = await Promise.all([
    supabase
      .from("business_service_plans")
      .select("category_id, hospedaje_type_id, quantity")
      .eq("business_id", businessId),
    supabase
      .from("services")
      .select("category_id, hospedaje_type_id")
      .eq("business_id", businessId),
  ]);
  if (plans.error || services.error) {
    throw new Error("No se pudo consultar el plan del negocio.");
  }

  const created = (services.data ?? []) as Array<{
    category_id: string;
    hospedaje_type_id: string | null;
  }>;
  return ((plans.data ?? []) as PlanAvailability[]).filter((plan) => {
    const used = created.filter((service) =>
      service.category_id === plan.category_id &&
      (service.hospedaje_type_id ?? null) === (plan.hospedaje_type_id ?? null)
    ).length;
    return used < plan.quantity;
  });
}

export type PlanUsage = {
  category_id: string;
  category_label: string;
  hospedaje_type_id: string | null;
  type_label: string | null;
  quantity: number;
  used: number;
  remaining: number;
};

// Cupos del plan con lo que ya se creó, con nombres legibles para mostrar al propietario.
export async function loadOwnerPlanUsage(
  supabase: SupabaseClient,
  businessId: string,
): Promise<PlanUsage[]> {
  const [plans, services, categories, types] = await Promise.all([
    supabase
      .from("business_service_plans")
      .select("category_id, hospedaje_type_id, quantity")
      .eq("business_id", businessId),
    supabase
      .from("services")
      .select("category_id, hospedaje_type_id")
      .eq("business_id", businessId),
    supabase.from("categories").select("id, label"),
    supabase.from("hospedaje_types").select("id, label"),
  ]);
  if (plans.error || services.error || categories.error || types.error) {
    throw new Error("No se pudo consultar el plan del negocio.");
  }

  const created = (services.data ?? []) as Array<{
    category_id: string;
    hospedaje_type_id: string | null;
  }>;
  const categoryLabels = new Map(
    (categories.data ?? []).map((row) => [String(row.id), String(row.label)]),
  );
  const typeLabels = new Map(
    (types.data ?? []).map((row) => [String(row.id), String(row.label)]),
  );

  return ((plans.data ?? []) as PlanAvailability[]).map((plan) => {
    const used = created.filter((service) =>
      service.category_id === plan.category_id &&
      (service.hospedaje_type_id ?? null) === (plan.hospedaje_type_id ?? null)
    ).length;
    return {
      category_id: plan.category_id,
      category_label: categoryLabels.get(plan.category_id) ?? plan.category_id,
      hospedaje_type_id: plan.hospedaje_type_id,
      type_label: plan.hospedaje_type_id
        ? typeLabels.get(plan.hospedaje_type_id) ?? plan.hospedaje_type_id
        : null,
      quantity: plan.quantity,
      used,
      remaining: Math.max(plan.quantity - used, 0),
    };
  });
}
