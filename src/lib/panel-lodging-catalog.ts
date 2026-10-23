import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Area,
  CatalogPhotos,
  RatePeriod,
  Room,
} from "@/components/lodging-catalog-manager";
import type { Photo } from "@/components/panel-gallery-manager";

// Carga las habitaciones, áreas, tarifas y fotos de cada una para un hospedaje.
export async function loadLodgingCatalog(supabase: SupabaseClient, serviceId: string) {
  const [rooms, areas, areaPhotos] = await Promise.all([
    supabase
      .from("room_types")
      .select(
        "id, name, description, capacity, beds_label, price_cents, total_units, " +
        "booking_unit, bedroom_count, bathroom_count, area_m2, details",
      )
      .eq("service_id", serviceId)
      .order("position"),
    supabase
      .from("lodging_areas")
      .select(
        "id, name, description, is_available, opening_hours, capacity, " +
        "included_in_rate, additional_price_cents, access_details, details",
      )
      .eq("service_id", serviceId)
      .order("position"),
    supabase
      .from("service_photos")
      .select("id, storage_path, is_cover, position, lodging_area_id")
      .eq("service_id", serviceId)
      .not("lodging_area_id", "is", null)
      .order("position"),
  ]);
  if (rooms.error || areas.error || areaPhotos.error) {
    throw new Error("No se pudieron cargar las habitaciones y áreas.");
  }

  const roomRecords = (rooms.data ?? []) as unknown as Room[];
  const roomIds = roomRecords.map((room) => room.id);
  const [rates, roomPhotos] = roomIds.length
    ? await Promise.all([
        supabase
          .from("lodging_rate_periods")
          .select(
            "id, room_type_id, valid_from, valid_to, price_cents, minimum_nights, " +
            "included_guests, extra_guest_price_cents, cleaning_fee_cents, " +
            "taxes_details, deposit_cents, cancellation_policy",
          )
          .in("room_type_id", roomIds)
          .order("valid_from"),
        supabase
          .from("room_type_photos")
          .select("id, room_type_id, storage_path, is_cover, position")
          .in("room_type_id", roomIds)
          .order("position"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  if (rates.error || roomPhotos.error) {
    throw new Error("No se pudieron cargar las tarifas y fotos de las habitaciones.");
  }

  const photos: CatalogPhotos = { rooms: {}, areas: {} };
  for (const row of (roomPhotos.data ?? []) as Array<Photo & { room_type_id: string }>) {
    (photos.rooms[row.room_type_id] ??= []).push(cleanPhoto(row));
  }
  for (const row of (areaPhotos.data ?? []) as Array<Photo & { lodging_area_id: string }>) {
    (photos.areas[row.lodging_area_id] ??= []).push(cleanPhoto(row));
  }

  return {
    rooms: roomRecords,
    areas: (areas.data ?? []) as unknown as Area[],
    rates: (rates.data ?? []) as unknown as RatePeriod[],
    photos,
  };
}

function cleanPhoto(photo: Photo): Photo {
  return {
    id: photo.id,
    storage_path: photo.storage_path,
    is_cover: photo.is_cover,
    position: photo.position,
  };
}
