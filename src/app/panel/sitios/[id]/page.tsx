import { notFound } from "next/navigation";
import { SiteForm } from "@/components/panel-site-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadSiteOptions } from "@/lib/panel-site-options";

// Edita un sitio turístico existente en la misma pestaña.
export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const [{ data: site, error }, options] = await Promise.all([
    supabase
      .from("tourist_sites")
      .select("id, name, slug, description, short_description, province_id, city_id, sort_order")
      .eq("id", id)
      .maybeSingle(),
    loadSiteOptions(supabase),
  ]);
  if (error) throw new Error("No se pudo cargar el sitio turístico.");
  if (!site) notFound();

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{site.name}</h1>
          <p>Editar la información que muestra la web para este destino.</p>
        </div>
      </header>
      <SiteForm site={site} provinces={options.provinces} cities={options.cities} />
    </>
  );
}
