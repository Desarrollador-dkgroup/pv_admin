import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromotionServiceOption } from "@/components/panel-service-promotion-form";
import { formatPromotionSchedule } from "@/lib/promotion-schedule";
import type { CommissionTerms } from "@/lib/promotion-commission";

// Servicios del usuario con sus habitaciones y los contratos de sus negocios.
export async function loadPromotionFormData(supabase: SupabaseClient) {
  const { data: services, error } = await supabase
    .from("services")
    .select("id, name, category_id, business_id, base_price_cents")
    .order("name");
  if (error) throw new Error("No se pudieron cargar tus servicios.");

  const serviceRows = services ?? [];
  const serviceIds = serviceRows.map((service) => service.id);
  const businessIds = [...new Set(serviceRows.map((service) => service.business_id))];

  const [{ data: rooms, error: roomsError }, { data: contracts, error: contractsError }] =
    await Promise.all([
      serviceIds.length
        ? supabase.from("room_types").select("id, name, price_cents, service_id").in("service_id", serviceIds)
        : Promise.resolve({ data: [], error: null }),
      businessIds.length
        ? supabase
          .from("business_contracts")
          .select("business_id, base_commission_pct, discount_limit_pct, target_profit_cents, commission_cap_pct")
          .in("business_id", businessIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (roomsError || contractsError) throw new Error("No se pudieron cargar habitaciones o contratos.");

  const options: PromotionServiceOption[] = serviceRows.map((service) => ({
    id: service.id,
    name: service.name,
    categoryId: service.category_id,
    businessId: service.business_id,
    priceCents: service.base_price_cents,
    rooms: (rooms ?? [])
      .filter((room) => room.service_id === service.id)
      .map((room) => ({ id: room.id, name: room.name, priceCents: room.price_cents })),
  }));

  const termsByBusiness: Record<string, CommissionTerms | null> = {};
  for (const business of businessIds) termsByBusiness[business] = null;
  for (const contract of contracts ?? []) {
    termsByBusiness[contract.business_id] = {
      baseCommissionPct: Number(contract.base_commission_pct),
      discountLimitPct: Number(contract.discount_limit_pct),
      targetProfitCents: Number(contract.target_profit_cents),
      commissionCapPct: Number(contract.commission_cap_pct),
    };
  }

  return { options, termsByBusiness };
}

// Texto de la vigencia de una promoción de servicio.
export function scheduleLabel(promotion: {
  schedule_mode: string;
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[];
}) {
  return formatPromotionSchedule(promotion);
}
