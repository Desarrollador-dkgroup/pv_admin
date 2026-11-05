import { notFound } from "next/navigation";
import { AdForm } from "@/components/panel-ad-form";
import { PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Edita un anuncio existente: título, imagen, promoción, fechas y estado.
export default async function EditAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const [{ data: ad }, { data: promotions }] = await Promise.all([
    admin.from("ads").select("*").eq("id", id).maybeSingle(),
    admin.from("service_promotions").select("id, title, services(name)").order("title"),
  ]);
  if (!ad) notFound();

  const options = (promotions ?? []).map((promotion) => {
    const service = Array.isArray(promotion.services) ? promotion.services[0] : promotion.services;
    return { id: promotion.id, label: `${promotion.title} · ${service?.name ?? "servicio"}` };
  });

  return (
    <>
      <PageHeader
        back={{ href: "/panel/anuncios", label: "Volver a anuncios" }}
        title={`Editar «${ad.title}»`}
        description="Cambia la imagen, la promoción o las fechas en que se muestra."
      />
      <AdForm
        promotions={options}
        ad={{
          id: ad.id,
          title: ad.title,
          imageUrl: admin.storage.from("ads-media").getPublicUrl(ad.image_path).data.publicUrl,
          service_promotion_id: ad.service_promotion_id,
          starts_on: ad.starts_on,
          ends_on: ad.ends_on,
          is_active: ad.is_active,
        }}
      />
    </>
  );
}
