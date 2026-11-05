import { AdForm } from "@/components/panel-ad-form";
import { PageHeader } from "@/components/ui";
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
      <PageHeader
        back={{ href: "/panel/anuncios", label: "Volver a anuncios" }}
        title="Nuevo anuncio"
        description="La imagen se muestra al entrar a la página principal."
      />
      <AdForm promotions={options} />
    </>
  );
}
