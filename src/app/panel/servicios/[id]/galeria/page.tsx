import Link from "next/link";
import { notFound } from "next/navigation";
import { PanelGalleryManager } from "@/components/panel-gallery-manager";
import type { GalleryGroup } from "@/components/panel-gallery-manager";
import { getPanelIdentity } from "@/lib/panel-access";

// Carga galerías generales, por área y por habitación desde la base de datos.
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

  const isLodging = service.hospedaje_type_id !== null;
  const servicePhotos = await supabase
    .from("service_photos")
    .select("id, storage_path, is_cover, position, lodging_area_id")
    .eq("service_id", id)
    .order("position");
  if (servicePhotos.error) throw new Error("No se pudieron cargar las fotos del servicio.");

  let areaRows: Array<{ id: string; name: string }> = [];
  let roomRows: Array<{ id: string; name: string }> = [];
  let roomPhotoRows: Array<{
    id: string;
    room_type_id: string;
    storage_path: string;
    is_cover: boolean;
    position: number;
  }> = [];

  if (isLodging) {
    const [areas, rooms] = await Promise.all([
      supabase
        .from("lodging_areas")
        .select("id, name")
        .eq("service_id", id)
        .order("position"),
      supabase
        .from("room_types")
        .select("id, name")
        .eq("service_id", id)
        .order("position"),
    ]);
    if (areas.error || rooms.error) throw new Error("No se pudieron cargar las galerías.");
    areaRows = areas.data ?? [];
    roomRows = rooms.data ?? [];

    if (roomRows.length) {
      const roomPhotos = await supabase
        .from("room_type_photos")
        .select("id, room_type_id, storage_path, is_cover, position")
        .in("room_type_id", roomRows.map((room) => room.id))
        .order("position");
      if (roomPhotos.error) throw new Error("No se pudieron cargar fotos de unidades.");
      roomPhotoRows = roomPhotos.data ?? [];
    }
  }

  const isRestaurant = service.category_id === "restaurantes";
  const generalLimit = isLodging ? 15 : isRestaurant ? 30 : 10;
  const groups: GalleryGroup[] = [
    {
      id: "general",
      label: "Galería general",
      table: "service_photos",
      relationId: null,
      limit: generalLimit,
      photos: (servicePhotos.data ?? [])
        .filter((photo) => photo.lodging_area_id === null)
        .map(cleanPhoto),
    },
  ];

  for (const area of areaRows) {
    groups.push({
      id: `area-${area.id}`,
      label: area.name,
      table: "service_photos",
      relationId: area.id,
      limit: 10,
      photos: (servicePhotos.data ?? [])
        .filter((photo) => photo.lodging_area_id === area.id)
        .map(cleanPhoto),
    });
  }

  for (const room of roomRows) {
    groups.push({
      id: `room-${room.id}`,
      label: room.name,
      table: "room_type_photos",
      relationId: room.id,
      limit: 10,
      photos: roomPhotoRows
        .filter((photo) => photo.room_type_id === room.id)
        .map(cleanPhoto),
    });
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Galería de {service.name}</h1>
          <p>Las imágenes se guardan en el almacenamiento de Supabase.</p>
        </div>
        <Link className="button quiet" href={`/panel/servicios/${id}`}>
          Volver al servicio
        </Link>
      </header>
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
