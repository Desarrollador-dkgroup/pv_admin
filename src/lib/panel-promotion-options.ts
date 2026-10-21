import type { SupabaseClient } from "@supabase/supabase-js";
import { capitalize } from "@/lib/panel-format";

// Tipos de destino que acepta una promoción; cada uno guarda su identificador en una columna.
export const DESTINATION_KINDS = ["service", "province", "category"] as const;
export type DestinationKind = (typeof DESTINATION_KINDS)[number];

export type DestinationOption = { ref: string; label: string; group: string };

// Carga destinos reales para el selector y devuelve un mapa para mostrar nombres en la lista.
export async function loadPromotionOptions(supabase: SupabaseClient) {
  const [services, provinces, categories] = await Promise.all([
    supabase.from("services").select("id, name").order("name").limit(500),
    supabase.from("provinces").select("id").order("sort_order"),
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);
  if (services.error || provinces.error || categories.error) {
    throw new Error("No se pudieron cargar los destinos de las promociones.");
  }

  const destinations: DestinationOption[] = [
    ...(services.data ?? []).map((row) => ({
      ref: `service:${row.id}`, label: row.name, group: "Servicio",
    })),
    ...(provinces.data ?? []).map((row) => ({
      ref: `province:${row.id}`, label: capitalize(row.id), group: "Provincia",
    })),
    ...(categories.data ?? []).map((row) => ({
      ref: `category:${row.id}`, label: row.label, group: "Categoría",
    })),
  ];
  const labels = new Map(destinations.map((item) => [item.ref, item.label]));
  return { destinations, labels };
}

// Nombre legible del destino guardado en una promoción, o un texto de respaldo.
export function destinationRefOf(promotion: {
  destination_kind: string;
  destination_service_id: string | null;
  destination_province_id: string | null;
  destination_category_id: string | null;
}): string {
  const id = promotion.destination_kind === "service" ? promotion.destination_service_id
      : promotion.destination_kind === "province" ? promotion.destination_province_id
        : promotion.destination_category_id;
  return id ? `${promotion.destination_kind}:${id}` : "";
}
