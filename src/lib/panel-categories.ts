import type { SupabaseClient } from "@supabase/supabase-js";

// Etiquetas legibles de las categorías («hospedaje» → «Hospedaje»). Evita mostrar ids crudos.
export async function loadCategoryLabels(supabase: SupabaseClient) {
  const { data } = await supabase.from("categories").select("id, label");
  const labels = new Map((data ?? []).map((item) => [item.id as string, item.label as string]));
  return (id: string | null | undefined) => (id ? labels.get(id) ?? id : "Sin categoría");
}
