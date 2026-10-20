import { SiteForm } from "@/components/panel-site-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadSiteOptions } from "@/lib/panel-site-options";

// Formulario para crear un sitio turístico.
// Si llega desde un destino, la provincia ya viene elegida.
export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ provincia?: string }>;
}) {
  const { provincia } = await searchParams;
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);
  const { provinces, cities } = await loadSiteOptions(supabase);

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Nuevo sitio turístico</h1>
          <p>El país es Panamá. La provincia define el destino que verá la web.</p>
        </div>
      </header>
      <SiteForm
        site={null}
        provinces={provinces}
        cities={cities}
        defaultProvinceId={provincia ?? ""}
      />
    </>
  );
}
