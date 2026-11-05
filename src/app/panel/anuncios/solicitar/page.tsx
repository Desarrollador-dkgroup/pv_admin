import { notFound } from "next/navigation";
import { AdRequestForm } from "@/components/panel-ad-request-form";
import { PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadAdPromotionOptions } from "@/lib/panel-ad-options";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// El propietario pide un anuncio para una de sus promociones.
export default async function RequestAdPage() {
  const { role, businessIds } = await getPanelIdentity();
  requireRole(role, ["propietario"]);
  const businessId = businessIds[0];
  if (!businessId) notFound();

  const promotions = await loadAdPromotionOptions(getSupabaseAdminClient(), [businessId]);
  return (
    <>
      <PageHeader
        back={{ href: "/panel/anuncios", label: "Volver a anuncios" }}
        title="Solicitar anuncio"
        description="Elige la promoción, sube la imagen y dinos cuándo quieres que se muestre. El equipo lo revisa."
      />
      <AdRequestForm businessId={businessId} promotions={promotions} />
    </>
  );
}
