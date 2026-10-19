import type { SupabaseClient } from "@supabase/supabase-js";
import { capitalize } from "@/lib/panel-format";

// Carga provincias y ciudades para los selectores de sitios turísticos.
export async function loadSiteOptions(supabase: SupabaseClient) {
  const [provinces, cities] = await Promise.all([
    supabase.from("provinces").select("id").order("sort_order"),
    supabase.from("cities").select("id, name").order("name"),
  ]);
  if (provinces.error || cities.error) {
    throw new Error("No se pudieron cargar provincias y ciudades.");
  }
  return {
    provinces: (provinces.data ?? []).map((row) => ({
      id: row.id,
      label: capitalize(row.id),
    })),
    cities: (cities.data ?? []).map((row) => ({ id: row.id, label: row.name })),
  };
}
