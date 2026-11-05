import { notFound } from "next/navigation";
import { LodgingCatalogManager } from "@/components/lodging-catalog-manager";
import { PanelServiceEditor } from "@/components/panel-service-editor";
import { Badge, PageHeader, Tabs } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { ownerStateOf } from "@/lib/panel-labels";
import { loadLodgingCatalog } from "@/lib/panel-lodging-catalog";

// Ficha del servicio por pestañas: ficha, habitaciones (hospedaje), galería, menú y vista previa.
export default async function EditServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ seccion?: string }>;
}) {
  const { id } = await params;
  const { seccion = "ficha" } = await searchParams;
  if (id === "nuevo") notFound();
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name, status, review_status, category_id, hospedaje_type_id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !service) notFound();

  const canEditRooms = service.category_id === "hospedaje" && !!service.hospedaje_type_id &&
    role !== "collaborator" &&
    (role !== "propietario" || businessIds.includes(service.business_id));
  const tabItems = [
    { id: "ficha", label: "Ficha del servicio", href: `/panel/servicios/${id}` },
    ...(canEditRooms
      ? [{ id: "habitaciones", label: "Habitaciones, tarifas y áreas",
        href: `/panel/servicios/${id}?seccion=habitaciones` }]
      : []),
    { id: "galeria", label: "Galería", href: `/panel/servicios/${id}/galeria` },
    ...(service.category_id === "restaurantes"
      ? [{ id: "menu", label: "Menú", href: `/panel/servicios/${id}/menu` }]
      : []),
    { id: "vista", label: "Vista previa", href: `/panel/servicios/${id}/vista-previa` },
  ];
  const active = seccion === "habitaciones" && canEditRooms ? "habitaciones" : "ficha";
  const tabs = <Tabs items={tabItems} active={active} />;

  if (active === "habitaciones" && service.hospedaje_type_id) {
    const catalog = await loadLodgingCatalog(supabase, id);
    const state = ownerStateOf(service);
    return (
      <>
        <PageHeader
          back={{ href: "/panel/servicios", label: "Volver a servicios" }}
          title={service.name}
          description="Agrega cada tipo de habitación por separado, cuántas iguales tienes, sus fotos y sus tarifas."
          actions={<Badge tone={state.tone}>{state.label}</Badge>}
        />
        {tabs}
        <LodgingCatalogManager
          serviceId={id}
          lodgingTypeId={service.hospedaje_type_id}
          isOwner={role === "propietario"}
          rooms={catalog.rooms}
          areas={catalog.areas}
          rates={catalog.rates}
          photos={catalog.photos}
        />
      </>
    );
  }

  return <PanelServiceEditor serviceId={id} tabs={tabs} />;
}
