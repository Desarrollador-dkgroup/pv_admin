import { Badge, Button, PageHeader, Panel } from "@/components/ui";
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

  const [{ data, error }, categoryOf] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, status, category_id, is_recommended, businesses(name)")
      .or("status.eq.published,is_recommended.eq.true")
      .order("name"),
    loadCategoryLabels(supabase),
  ]);
  if (error) throw new Error("No se pudieron cargar los servicios.");

  const rows = (data ?? []) as unknown as Row[];
  const featured = rows.filter((row) => row.is_recommended);
  const candidates = rows.filter((row) => !row.is_recommended && row.status === "published");

  const renderRow = (row: Row) => {
    const state = statusOf(SERVICE_STATUS, row.status);
    return (
      <div className="list-row" key={row.id}>
        <div className="list-row-text">
          <b>{row.name}</b>
          <small>
            {related(row.businesses)?.name ?? "Negocio sin nombre"} · {categoryOf(row.category_id)}
          </small>
        </div>
        <Badge tone={state.tone}>{state.label}</Badge>
        <form action={setFeaturedAction}>
          <input type="hidden" name="service_id" value={row.id} />
          <input type="hidden" name="featured" value={row.is_recommended ? "false" : "true"} />
          <Button tone={row.is_recommended ? "quiet" : "secondary"} type="submit" className="small">
            {row.is_recommended ? "Quitar" : "Destacar"}
          </Button>
        </form>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Destacados"
        description="Servicios que aparecen en «Servicio destacado» de la portada. Solo el equipo los administra."
      />
      <Panel>
        <div className="section-heading">
          <h2>Servicios destacados</h2>
          <span className="muted">{featured.length} en la portada</span>
        </div>
        {featured.map(renderRow)}
        {!featured.length && (
          <p className="muted">
            Todavía no hay destacados. Mientras tanto, la portada muestra los primeros 6 servicios.
          </p>
        )}
      </Panel>
      <Panel>
        <div className="section-heading">
          <h2>Agregar a destacados</h2>
          <span className="muted">Servicios publicados que no están destacados</span>
        </div>
        {candidates.map(renderRow)}
        {!candidates.length && <p className="muted">No hay más servicios publicados por destacar.</p>}
      </Panel>
    </>
  );
}
