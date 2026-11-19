import { FeaturedPicker, type FeaturedRow } from "@/components/featured-picker";
import { PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadCategoryLabels } from "@/lib/panel-categories";
import { SERVICE_STATUS, statusOf } from "@/lib/panel-labels";
import { related } from "@/lib/panel-relations";
import { setFeaturedAction } from "./actions";

type Row = {
  id: string;
  name: string;
  status: string | null;
  category_id: string;
  is_recommended: boolean;
  businesses: { name: string } | { name: string }[] | null;
};

// Servicios destacados: aparecen en «Servicio destacado» de la portada pública.
export default async function FeaturedPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const [{ data, error }, { data: categories }] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, status, category_id, is_recommended, businesses(name)")
      .or("status.eq.published,is_recommended.eq.true")
      .order("name"),
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);
  if (error) throw new Error("No se pudieron cargar los servicios.");

  const categoryOf = await loadCategoryLabels(supabase);
  const rows: FeaturedRow[] = ((data ?? []) as unknown as Row[]).map((row) => {
    const state = statusOf(SERVICE_STATUS, row.status);
    return {
      id: row.id,
      name: row.name,
      businessName: related(row.businesses)?.name ?? "Negocio sin nombre",
      categoryId: row.category_id,
      categoryLabel: categoryOf(row.category_id),
      statusLabel: state.label,
      statusTone: state.tone,
      featured: row.is_recommended,
    };
  });

  return (
    <>
      <PageHeader
        title="Destacados"
        description="Servicios que aparecen en «Servicio destacado» de la portada. Solo el equipo los administra."
      />
      <FeaturedPicker
        rows={rows}
        categories={(categories ?? []).map((item) => ({ value: item.id, label: item.label }))}
        action={setFeaturedAction}
      />
    </>
  );
}
