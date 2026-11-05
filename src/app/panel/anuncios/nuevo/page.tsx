import { notFound } from "next/navigation";
import { AdForm } from "@/components/panel-ad-form";
import { PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadAdPromotionOptions } from "@/lib/panel-ad-options";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Crea y publica un anuncio. Si viene de una solicitud aprobada (?solicitud=ID), se llena solo.
export default async function NewAdPage({
  searchParams,
}: {
  searchParams: Promise<{ solicitud?: string }>;
}) {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);
  const { solicitud } = await searchParams;

  const admin = getSupabaseAdminClient();
  const options = await loadAdPromotionOptions(admin);

  let request;
  if (solicitud) {
    const { data } = await admin
      .from("ad_requests")
      .select("id, title, image_path, service_promotion_id, starts_on, ends_on, status")
      .eq("id", solicitud)
      .maybeSingle();
    if (!data || !["en_gestion", "documento_listo"].includes(data.status)) notFound();
    request = {
      id: data.id,
      title: data.title,
      imageUrl: admin.storage.from("ads-media").getPublicUrl(data.image_path).data.publicUrl,
      service_promotion_id: data.service_promotion_id,
      starts_on: data.starts_on,
      ends_on: data.ends_on,
    };
  }

  return (
    <>
      <PageHeader
        back={{ href: "/panel/anuncios", label: "Volver a anuncios" }}
        title="Nuevo anuncio"
        description="La imagen se muestra al entrar a la página principal."
      />
      <AdForm promotions={options} request={request} />
    </>
  );
}
