import Link from "next/link";
import { notFound } from "next/navigation";
import { PreviewFrame } from "@/components/public-service/preview-frame";
import { ServiceScreen } from "@/components/public-service/service-screen";
import { Badge, PageHeader, Tabs } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { ownerStateOf } from "@/lib/panel-labels";
import { getServiceDetailForPreview } from "@/lib/public-service/service-detail";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { serviceTabItems } from "@/lib/panel-service-tabs";

// Vista previa: la ficha se ve igual que en la web, con el contenido guardado (incluso borradores).
// Solo el equipo y el propietario del negocio pueden abrirla.
export default async function ServicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, business_id, category_id, name, status, review_status")
    .eq("id", id)
    .maybeSingle();
  if (error || !service ||
    (role === "propietario" && !businessIds.includes(service.business_id))) notFound();

  // La clave de servicio lee borradores, pero solo después de comprobar el acceso de arriba.
  const detail = await getServiceDetailForPreview(getSupabaseAdminClient(), id);
  if (!detail) notFound();

  const state = ownerStateOf(service);
  const isCollaborator = role === "collaborator";
  return (
    <>
      <PageHeader
        back={isCollaborator
          ? { href: "/panel/revision", label: "Volver a revisión" }
          : { href: "/panel/servicios", label: "Volver a servicios" }}
        title={service.name}
        description="Así se ve la ficha en la web. Solo tú y el equipo pueden verla mientras trabajas."
        actions={
          <>
            <Badge tone={state.tone}>{state.label}</Badge>
            {!isCollaborator && (
              <Link className="button secondary" href={`/panel/servicios/${id}`}>Editar</Link>
            )}
          </>
        }
      />
      {!isCollaborator && <Tabs items={serviceTabItems(service)} active="vista" />}
      <PreviewFrame>
        <ServiceScreen detail={detail} search={{}} />
      </PreviewFrame>
    </>
  );
}
