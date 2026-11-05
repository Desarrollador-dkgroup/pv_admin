import { notFound } from "next/navigation";
import { AdForm } from "@/components/panel-ad-form";
import { AdDocumentForm } from "@/components/panel-ad-document-form";
import { Panel } from "@/components/ui";
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
  let documentUrl: string | null = null;
  let requestDocument: { id: string; hasDocument: boolean } | null = null;
  if (solicitud) {
    const { data } = await admin
      .from("ad_requests")
      .select("id, title, image_path, document_path, service_promotion_id, starts_on, ends_on, status")
      .eq("id", solicitud)
      .maybeSingle();
    if (!data || !["en_gestion", "documento_listo", "publicado"].includes(data.status)) notFound();
    request = {
      id: data.id,
      title: data.title,
      imageUrl: admin.storage.from("ads-media").getPublicUrl(data.image_path).data.publicUrl,
      service_promotion_id: data.service_promotion_id,
      starts_on: data.starts_on,
      ends_on: data.ends_on,
    };
    documentUrl = data.document_path
      ? (await admin.storage.from("contracts").createSignedUrl(data.document_path, 600)).data?.signedUrl ?? null
      : null;
    requestDocument = { id: data.id, hasDocument: Boolean(data.document_path) };
  }

  return (
    <>
      <PageHeader
        back={{ href: "/panel/anuncios", label: "Volver a anuncios" }}
        title="Nuevo anuncio"
        description="La imagen se muestra al entrar a la página principal."
      />
      <AdForm promotions={options} request={request} />
      {requestDocument && (
        <Panel>
          <h2>Documento del anuncio</h2>
          <p className="muted">
            El documento que firmó el propietario, donde confirma el pago por la publicación. Se guarda también en
            su sección de contrato.
          </p>
          {documentUrl && (
            <a className="text-link" href={documentUrl} target="_blank" rel="noreferrer">Ver documento actual</a>
          )}
          <AdDocumentForm requestId={requestDocument.id} hasDocument={requestDocument.hasDocument} />
        </Panel>
      )}
    </>
  );
}
