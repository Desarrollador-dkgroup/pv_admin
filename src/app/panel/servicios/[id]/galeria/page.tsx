import { notFound } from "next/navigation";
import { PanelGalleryManager } from "@/components/panel-gallery-manager";
import type { GalleryGroup } from "@/components/panel-gallery-manager";
import { PageHeader, Tabs } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { serviceTabItems } from "@/lib/panel-service-tabs";

// Galería general del servicio. Las fotos de habitaciones y áreas se suben en su tarjeta.
export default async function ServiceGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name, category_id, hospedaje_type_id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !service || role === "collaborator" ||
    (role === "propietario" && !businessIds.includes(service.business_id))) notFound();

  // Aquí solo vive la galería general; cada habitación y área tiene la suya en la página
  // del servicio.
  const servicePhotos = await supabase
    .from("service_photos")
    .select("id, storage_path, is_cover, position")
    .eq("service_id", id)
    .is("lodging_area_id", null)
    .order("position");
  if (servicePhotos.error) throw new Error("No se pudieron cargar las fotos del servicio.");

  const isLodging = service.hospedaje_type_id !== null;
  const isRestaurant = service.category_id === "restaurantes";
  const generalLimit = isLodging ? 15 : isRestaurant ? 30 : 10;
  const groups: GalleryGroup[] = [
    {
      id: "general",
      label: "Galería general",
      table: "service_photos",
      relationId: null,
      limit: generalLimit,
      photos: (servicePhotos.data ?? []).map(cleanPhoto),
    },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/panel/servicios", label: "Volver a servicios" }}
        title={`Galería general de ${service.name}`}
        description={isLodging
          ? "Fotos generales del hospedaje. Las de cada habitación se añaden en su tarjeta."
          : "JPG, PNG o WebP de hasta 8 MB cada una. La primera marcada es la portada."}
      />
      <Tabs items={serviceTabItems(service)} active="galeria" />
      <PanelGalleryManager serviceId={id} groups={groups} />
    </>
  );
}

function cleanPhoto(photo: {
  id: string;
  storage_path: string;
  is_cover: boolean;
  position: number;
}) {
  return {
    id: photo.id,
    storage_path: photo.storage_path,
    is_cover: photo.is_cover,
    position: photo.position,
  };
}
