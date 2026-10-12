import type { SupabaseClient } from "@supabase/supabase-js";
import { validatePromotionPrices } from "@/types/content";
import type { PromotionContent } from "@/types/content";

// Guarda contenido y precios; PostgreSQL calcula el porcentaje automáticamente.
export async function updatePromotionContent(
  supabase: SupabaseClient,
  promotionId: string,
  content: PromotionContent,
) {
  validatePromotionPrices(content);
  const { data, error } = await supabase
    .from("promotions")
    .update(content)
    .eq("id", promotionId)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Lee todas las ubicaciones asociadas al servicio para la futura selección múltiple.
export async function getServiceSiteIds(supabase: SupabaseClient, serviceId: string) {
  const { data, error } = await supabase
    .from("service_tourist_sites")
    .select("tourist_site_id")
    .eq("service_id", serviceId);

  if (error) throw new Error(error.message);
  return (data ?? []).map((link) => String(link.tourist_site_id));
}

// Sustituye las ubicaciones de forma atómica; requiere los futuros permisos de escritura.
export async function replaceServiceSiteIds(
  supabase: SupabaseClient,
  serviceId: string,
  siteIds: string[],
) {
  const { error } = await supabase.rpc("set_service_tourist_sites", {
    p_service_id: serviceId,
    p_tourist_site_ids: [...new Set(siteIds)],
  });

  if (error) throw new Error(error.message);
}

// Crea sitios turísticos mediante las políticas de acceso que tenga la sesión.
export async function createTouristSite(
  supabase: SupabaseClient,
  site: { name: string; slug: string; description: string; city_id: string; province_id: string },
) {
  const { data, error } = await supabase.from("tourist_sites").insert(site).select("id").single();

  if (error) throw new Error(error.message);
  return data;
}
