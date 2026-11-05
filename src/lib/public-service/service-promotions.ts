import type { SupabaseClient } from "@supabase/supabase-js";
import { formatPromotionSchedule } from "@/lib/public-service/promotion-schedule";
import { publicMediaUrl } from "@/lib/public-service/storage";

export type ServicePromotion = {
  id: string;
  title: string;
  description: string | null;
  discountPct: number;
  scheduleLabel: string;
  serviceId: string;
  serviceName: string;
  serviceSlug: string;
  categoryId: string;
  provinceId: string | null;
  siteIds: string[];
  siteNames: string[];
  roomId: string | null;
  roomName: string | null;
  regularCents: number | null;
  finalCents: number | null;
  photoUrl: string;
};

// Fecha y día de la semana en Panamá (UTC-5 sin horario de verano).
export function panamaToday(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Panama",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return { date, weekday };
}

export function isPromotionActiveOn(
  row: { schedule_mode: string; starts_on: string | null; ends_on: string | null; weekdays: number[] },
  today: { date: string; weekday: number },
) {
  if (row.schedule_mode === "range") {
    return Boolean(row.starts_on && row.ends_on)
      && today.date >= (row.starts_on ?? "") && today.date <= (row.ends_on ?? "");
  }
  return row.weekdays.includes(today.weekday);
}

type PromotionRow = {
  id: string;
  title: string;
  description: string | null;
  discount_pct: number | string;
  schedule_mode: string;
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[];
  room_type_id: string | null;
  services: {
    id: string;
    name: string;
    slug: string;
    category_id: string;
    destination_province_id: string | null;
    base_price_cents: number | null;
    service_tourist_sites: Array<{
      tourist_sites: { id: string; name: string; province_id: string | null } | null;
    }>;
    service_photos: Array<{ storage_path: string; is_cover: boolean; position: number }>;
  } | null;
  room_types: { id: string; name: string; price_cents: number | null } | null;
};

// Promociones de servicio vigentes hoy. Solo llegan servicios publicados (RLS).
// `includeDrafts` (vista previa del panel) incluye servicios aún no publicados. Solo lo usa
// el panel, que consulta con la clave de servicio; la web pública nunca lo pide.
export async function getActiveServicePromotions(
  now: Date = new Date(),
  serviceId: string | undefined,
  supabase: SupabaseClient,
  options: { includeDrafts?: boolean } = {},
): Promise<ServicePromotion[]> {
  let query = supabase
    .from("service_promotions")
    .select(`id, title, description, discount_pct, schedule_mode, starts_on, ends_on, weekdays,
      room_type_id,
      services!inner(id, name, slug, category_id, destination_province_id, base_price_cents,
        service_tourist_sites(tourist_sites(id, name, province_id)),
        service_photos(storage_path, is_cover, position)),
      room_types(id, name, price_cents)`)
    .eq("is_active", true);
  if (!options.includeDrafts) query = query.eq("services.status", "published");
  const { data, error } = await query.match(serviceId ? { "services.id": serviceId } : {});
  if (error) return [];

  const today = panamaToday(now);
  const rows = (data ?? []) as unknown as PromotionRow[];
  return rows.flatMap((row) => {
    const service = row.services;
    if (!service || !isPromotionActiveOn(row, today)) return [];
    const room = row.room_types;
    const regularCents = room ? room.price_cents : service.base_price_cents;
    const discount = Number(row.discount_pct);
    const cover = [...service.service_photos].sort((a, b) =>
      Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)[0];
    const sites = service.service_tourist_sites
      .map((link) => link.tourist_sites)
      .filter((site): site is { id: string; name: string; province_id: string | null } => Boolean(site));
    return [{
      id: row.id,
      title: row.title,
      description: row.description,
      discountPct: discount,
      scheduleLabel: formatPromotionSchedule(row),
      serviceId: service.id,
      serviceName: service.name,
      serviceSlug: service.slug,
      categoryId: service.category_id,
      provinceId: service.destination_province_id ?? sites[0]?.province_id ?? null,
      siteIds: sites.map((site) => site.id),
      siteNames: sites.map((site) => site.name),
      roomId: room?.id ?? null,
      roomName: room?.name ?? null,
      regularCents: regularCents ?? null,
      finalCents: regularCents
        ? Math.round(regularCents * (1 - discount / 100))
        : null,
      photoUrl: publicMediaUrl(cover?.storage_path, "service-media"),
    }];
  });
}
