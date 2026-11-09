import { notFound } from "next/navigation";
import { AdForm } from "@/components/panel-ad-form";
import { AdDocumentForm } from "@/components/panel-ad-document-form";
import { PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { loadAdPromotionOptions } from "@/lib/panel-ad-options";

// Edita un anuncio existente: título, imagen, promoción, fechas y estado.
export default async function EditAdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const { data: ad } = await admin.from("ads").select("*").eq("id", id).maybeSingle();
  if (!ad) notFound();
  const options = await loadAdPromotionOptions(admin);

  // Si el anuncio vino de una solicitud, aquí se adjunta el documento firmado por el propietario.
  const { data: request } = await admin
    .from("ad_requests")
    .select("id, document_path")
    .eq("ad_id", id)
    .maybeSingle();

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
          desktopImageUrl: ad.desktop_image_path
            ? admin.storage.from("ads-media").getPublicUrl(ad.desktop_image_path).data.publicUrl
            : null,
          service_promotion_id: ad.service_promotion_id,
          starts_on: ad.starts_on,
          ends_on: ad.ends_on,
          is_active: ad.is_active,
        }}
      />
      {request && (
        <Panel>
          <h2>Documento del anuncio</h2>
          <p className="muted">
            El documento que firmó el propietario, donde confirma el pago por la publicación. Se guarda también en
            su sección de contrato.
          </p>
          {request.document_path && (
            <a className="text-link" href={`/panel/anuncios/${id}/documento`} target="_blank"
              rel="noreferrer">Ver documento actual</a>
          )}
          <AdDocumentForm requestId={request.id} hasDocument={Boolean(request.document_path)} />
        </Panel>
      )}
    </>
  );
}
