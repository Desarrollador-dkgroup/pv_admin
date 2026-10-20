import type { SupabaseClient } from "@supabase/supabase-js";
import { capitalize } from "@/lib/panel-format";

// Carga las provincias que pueden ser destino de un sitio turístico.
export async function loadSiteOptions(supabase: SupabaseClient) {
  const provinces = await supabase.from("provinces").select("id").order("sort_order");
  if (provinces.error) throw new Error("No se pudieron cargar las provincias.");
  return {
    provinces: (provinces.data ?? []).map((row) => ({
      id: row.id,
      label: capitalize(row.id),
    })),
  };
}
