import type { SupabaseClient } from "@supabase/supabase-js";
import { promotionDestination, type PromotionForDestination } from "@/lib/panel-ad-destination";

type OptionRow = PromotionForDestination & { id: string };

// Promociones que un anuncio puede enlazar, con el texto de a dónde lleva cada una.
// Si se pasan negocios, solo salen las promociones de esos negocios.
export async function loadAdPromotionOptions(client: SupabaseClient, businessIds?: string[]) {
  let query = client
    .from("service_promotions")
    .select("id, title, room_type_id, services!inner(name, category_id, business_id), room_types(name)")
    .order("title");
  if (businessIds) query = query.in("services.business_id", businessIds);
  const { data } = await query;
  return ((data ?? []) as unknown as OptionRow[]).map((promotion) => {
    const service = Array.isArray(promotion.services) ? promotion.services[0] : promotion.services;
    return {
      id: promotion.id,
      label: `${promotion.title} · ${service?.name ?? "servicio"}`,
      destination: promotionDestination(promotion),
    };
  });
}
