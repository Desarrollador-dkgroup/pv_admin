import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteForm } from "@/components/panel-site-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadSiteOptions } from "@/lib/panel-site-options";

// Edita un sitio turístico existente.
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
      .select("*")
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
          <Link className="back-link" href={`/panel/sitios/${site.id}`}>← Volver al sitio</Link>
          <h1>Editar {site.name}</h1>
          <p>Cambia la información que muestra la web para este sitio.</p>
        </div>
      </header>
      <SiteForm site={site} provinces={options.provinces} cities={options.cities} />
    </>
  );
}
