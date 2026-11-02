import { AdForm } from "@/components/panel-ad-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Crea un anuncio que lleva a una promoción de servicio.
export default async function NewAdPage() {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const { data: promotions, error } = await admin
    .from("service_promotions")
    .select("id, title, services(name)")
    .order("title");
  if (error) throw new Error("No se pudieron cargar las promociones.");

  const options = (promotions ?? []).map((promotion) => {
    const service = Array.isArray(promotion.services) ? promotion.services[0] : promotion.services;
    return {
      id: promotion.id,
      label: `${promotion.title} · ${service?.name ?? "servicio"}`,
    };
  });

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Nuevo anuncio</h1>
          <p>La imagen se muestra al entrar a la página principal.</p>
        </div>
      </header>
      <AdForm promotions={options} />
    </>
  );
}
