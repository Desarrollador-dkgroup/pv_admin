"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formChecked, formText, nullableText } from "@/lib/panel-form";
import { previewPromotion, type CommissionTerms } from "@/lib/promotion-commission";

type FormState = { error: string };

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

// Crea o actualiza una promoción de servicio. Valida el descuento contra el contrato.
export async function saveServicePromotionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (role === "collaborator") return { error: "Tu cuenta no puede publicar promociones." };

  const promotionId = formText(formData, "promotion_id");
  const serviceId = formText(formData, "service_id");
  const roomTypeId = formText(formData, "room_type_id");
  const title = formText(formData, "title");
  const discount = Number(formText(formData, "discount_pct"));
  const mode = formText(formData, "schedule_mode");

  if (!serviceId || !title) return { error: "Completa el servicio y el título." };
  if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
    return { error: "El descuento debe ser mayor que 0% y menor que 100%." };
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, category_id, base_price_cents, business_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (!service) return { error: "No encontramos ese servicio." };

  let regularCents: number | null = service.base_price_cents;
  let targetRoomId: string | null = null;
  if (service.category_id === "hospedaje") {
    if (!roomTypeId) return { error: "Selecciona la habitación a la que aplica el descuento." };
    const { data: room } = await supabase
      .from("room_types")
      .select("id, price_cents, service_id")
      .eq("id", roomTypeId)
      .maybeSingle();
    if (!room || room.service_id !== service.id) {
      return { error: "Esa habitación no pertenece a este servicio." };
    }
    regularCents = room.price_cents;
    targetRoomId = room.id;
  }
  if (!regularCents || regularCents <= 0) {
    return { error: "Antes de crear promociones, el servicio necesita un precio regular." };
  }

  const { data: contract } = await supabase
    .from("business_contracts")
    .select("base_commission_pct, discount_limit_pct, target_profit_cents, commission_cap_pct")
    .eq("business_id", service.business_id)
    .maybeSingle();
  if (!contract) {
    return { error: "Este negocio no tiene contrato; no se pueden publicar promociones." };
  }
  const terms: CommissionTerms = {
    baseCommissionPct: Number(contract.base_commission_pct),
    discountLimitPct: Number(contract.discount_limit_pct),
    targetProfitCents: Number(contract.target_profit_cents),
    commissionCapPct: Number(contract.commission_cap_pct),
  };
  const preview = previewPromotion(regularCents, discount, terms);
  if (preview.blocked) {
    return {
      error: `Tu contrato permite un descuento máximo de ${preview.maxDiscountPct}% en este servicio.`,
    };
  }

  let startsOn: string | null = null;
  let endsOn: string | null = null;
  let weekdays: number[] = [];
  if (mode === "range") {
    startsOn = formText(formData, "starts_on") || null;
    endsOn = formText(formData, "ends_on") || null;
    if (!startsOn || !endsOn || endsOn < startsOn) {
      return { error: "Indica fecha de inicio y de fin, y que el fin sea posterior al inicio." };
    }
  } else if (mode === "weekdays") {
    weekdays = [...new Set(formData.getAll("weekday").map(Number))]
      .filter((day) => WEEKDAYS.includes(day))
      .sort((a, b) => a - b);
    if (!weekdays.length) return { error: "Selecciona al menos un día de la semana." };
  } else {
    return { error: "Elige cómo se aplica la promoción." };
  }

  const values = {
    service_id: service.id,
    room_type_id: targetRoomId,
    title,
    description: nullableText(formText(formData, "description")),
    discount_pct: discount,
    schedule_mode: mode,
    starts_on: startsOn,
    ends_on: endsOn,
    weekdays,
    is_active: formChecked(formData, "is_active"),
    updated_at: new Date().toISOString(),
  };

  const result = promotionId
    ? await supabase.from("service_promotions").update(values).eq("id", promotionId)
    : await supabase.from("service_promotions").insert(values);
  if (result.error) return { error: result.error.message };

  revalidatePath("/panel/promociones");
  redirect("/panel/promociones");
}

// Pausa o reactiva una promoción sin borrarla.
export async function setServicePromotionActiveAction(formData: FormData) {
  const { supabase, role } = await getPanelIdentity();
  if (role === "collaborator") return;
  const promotionId = formText(formData, "promotion_id");
  const active = formText(formData, "next_active") === "true";
  await supabase
    .from("service_promotions")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", promotionId);
  revalidatePath("/panel/promociones");
}
