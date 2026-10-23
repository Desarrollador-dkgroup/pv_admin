"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";
import type { Room } from "@/components/lodging-catalog-manager";
import { readRoomDetails } from "@/data/room-amenities";

type DeleteResult = { error: string; warning?: string };

const field = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export async function updateRoomTypeAction(
  serviceId: string,
  roomId: string,
  data: FormData,
): Promise<{ error: string; room?: Room }> {
  const { supabase, role, businessIds, suspended } = await getPanelIdentity();
  if (suspended || (!canManageCatalog(role) && role !== "propietario")) {
    return { error: "No tienes permiso para editar esta habitación." };
  }
  const { data: service, error: serviceError } = await supabase
    .from("services").select("business_id, category_id").eq("id", serviceId).maybeSingle();
  if (serviceError || !service || service.category_id !== "hospedaje" ||
    (role === "propietario" && !businessIds.includes(service.business_id))) {
    return { error: "No tienes acceso a este hospedaje." };
  }
  const { data: room, error: roomError } = await supabase
    .from("room_types").select("id, capacity, total_units")
    .eq("id", roomId).eq("service_id", serviceId).maybeSingle();
  if (roomError || !room) return { error: "No encontramos esta habitación." };

  const name = field(data, "room_name");
  const description = field(data, "room_description");
  const beds = field(data, "beds_label");
  const capacity = Number(field(data, "capacity"));
  const units = Number(field(data, "total_units"));
  const price = Number(field(data, "price"));
  if (!name || !description || !beds ||
    !Number.isInteger(capacity) || capacity < 1 ||
    !Number.isInteger(units) || units < 1 ||
    !Number.isFinite(price) || price <= 0) {
    return { error: "Completa nombre, descripción, camas, capacidad, cantidad y un precio mayor que cero." };
  }

  // Aumentar capacidad/inventario es seguro para reservas existentes. Para
  // reducirlos hay que comprobar TODO el historial, sin depender de RLS.
  if (capacity < room.capacity || units < room.total_units) {
    let admin: ReturnType<typeof getSupabaseAdminClient>;
    try {
      admin = getSupabaseAdminClient();
    } catch {
      return { error: "No se pudo verificar el historial de reservas. Intenta más tarde." };
    }
    const { count, error } = await admin.from("reservation_room_lines")
      .select("room_type_id", { count: "exact", head: true })
      .eq("room_type_id", roomId);
    if (error || count === null) return { error: "No se pudo verificar el historial de reservas." };
    if (count > 0) {
      return { error: "Esta habitación tiene reservas asociadas; no reduzcas su capacidad ni su cantidad." };
    }
  }

  const changes: Record<string, unknown> = {
    name,
    description,
    beds_label: beds,
    capacity,
    total_units: units,
    price_cents: Math.round(price * 100),
  };
  // El propietario también completa dormitorios, baños, área y comodidades.
  const optionalNumber = (key: string) => field(data, key) ? Number(field(data, key)) : null;
  changes.bedroom_count = optionalNumber("bedroom_count");
  changes.bathroom_count = optionalNumber("bathroom_count");
  changes.area_m2 = optionalNumber("area_m2");
  changes.details = readRoomDetails(data);
  const { data: updated, error: updateError } = await supabase.from("room_types")
    .update(changes).eq("id", roomId).eq("service_id", serviceId)
    .select("id, name, description, capacity, beds_label, price_cents, total_units, booking_unit, bedroom_count, bathroom_count, area_m2, details")
    .maybeSingle();
  if (updateError || !updated) {
    return { error: updateError?.message ?? "No se pudieron guardar los cambios." };
  }

  revalidatePath(`/panel/servicios/${serviceId}`);
  revalidatePath(`/panel/servicios/${serviceId}/vista-previa`);
  return { error: "", room: updated as unknown as Room };
}

// El borrado se verifica en el servidor para que una habitación usada en una
// reserva (incluso cancelada) no pueda borrar su historial por cascada.
export async function deleteRoomTypeAction(
  serviceId: string,
  roomId: string,
): Promise<DeleteResult> {
  const { supabase, role, businessIds, suspended } = await getPanelIdentity();
  if (suspended || (!canManageCatalog(role) && role !== "propietario")) {
    return { error: "No tienes permiso para eliminar esta habitación." };
  }
  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, business_id, category_id")
    .eq("id", serviceId)
    .maybeSingle();
  if (serviceError || !service || service.category_id !== "hospedaje" ||
    (role === "propietario" && !businessIds.includes(service.business_id))) {
    return { error: "No tienes acceso a este hospedaje." };
  }
  const { data: room, error: roomError } = await supabase
    .from("room_types")
    .select("id")
    .eq("id", roomId)
    .eq("service_id", serviceId)
    .maybeSingle();
  if (roomError || !room) return { error: "No encontramos esta habitación." };

  let admin: ReturnType<typeof getSupabaseAdminClient>;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return { error: "No se pudo verificar el historial de reservas. Intenta más tarde." };
  }
  const { count, error: usageError } = await admin
    .from("reservation_room_lines")
    .select("room_type_id", { count: "exact", head: true })
    .eq("room_type_id", roomId);
  if (usageError || count === null) {
    return { error: "No se pudo verificar si esta habitación tiene reservas." };
  }
  if (count > 0) {
    return {
      error: "Esta habitación tiene reservas asociadas. Puedes editar sus datos, pero no eliminar su historial.",
    };
  }

  const { data: photos, error: photosError } = await admin
    .from("room_type_photos")
    .select("storage_path")
    .eq("room_type_id", roomId);
  if (photosError) return { error: "No se pudieron verificar las fotos de la habitación." };

  // El borrado usa la sesión del usuario y sus políticas RLS; la clave de
  // servicio solo sirvió para verificar referencias y limpiar archivos propios.
  const { data: removed, error: deleteError } = await supabase
    .from("room_types")
    .delete()
    .eq("id", roomId)
    .eq("service_id", serviceId)
    .select("id")
    .maybeSingle();
  if (deleteError) return { error: deleteError.message };
  if (!removed) return { error: "No se eliminó la habitación. Revisa tus permisos." };

  revalidatePath(`/panel/servicios/${serviceId}`);
  revalidatePath(`/panel/servicios/${serviceId}/galeria`);
  revalidatePath(`/panel/servicios/${serviceId}/vista-previa`);

  const paths = (photos ?? []).map((photo) => photo.storage_path).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await admin.storage.from("service-media").remove(paths);
    if (storageError) {
      return { error: "", warning: "La habitación se eliminó, pero algunas fotos aún ocupan almacenamiento." };
    }
  }
  return { error: "" };
}
