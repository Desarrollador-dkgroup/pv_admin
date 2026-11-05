import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SERVICE_SELECT, adaptService, coverPath, formatPlace, type CatalogItem, type ServiceRow,
} from "@/lib/public-service/catalog";
import { getActiveServicePromotions, type ServicePromotion } from "@/lib/public-service/service-promotions";
import { publicMediaUrl } from "@/lib/public-service/storage";

// Todo lo que muestra la ficha de un servicio: la de la app más los datos que el panel ya
// guarda (hospedaje, habitaciones, restaurante, horarios y restaurantes vinculados).

export type Feature = { id: string; label: string; icon: string | null };

export type Room = {
  id: string;
  slug: string;
  name: string;
  description: string;
  capacity: number;
  beds: string;
  price: number;
  totalUnits: number;
  bedroomCount: number | null;
  bathroomCount: number | null;
  areaM2: number | null;
  details: Record<string, string>;
  amenities: string[];
  photos: string[];
};

export type Review = { id: string; author: string; rating: number; comment: string };

export type MenuSection = {
  id: string;
  title: string;
  dishes: { id: string; name: string; description: string; price: number }[];
};

export type RestaurantInfo = {
  tag: string;
  paymentMethods: string[];
  hoursFrom: string | null;
  hoursTo: string | null;
  hours: { day: number; opens: string; closes: string }[];
  features: Feature[];
  menu: MenuSection[];
  cuisineType: string | null;
  serviceStyle: string | null;
  ambience: string | null;
  averagePriceMin: number | null;
  averagePriceMax: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  websiteUrl: string | null;
  menuUrl: string | null;
  reservationPolicy: string | null;
  cancellationPolicy: string | null;
  acceptsReservations: boolean;
  minPartySize: number | null;
  maxPartySize: number | null;
};

export type LodgingInfo = Record<string, string | null> & { languages: string };

export type LinkedRestaurant = { id: string; slug: string; name: string; photo: string | null };

const DAY_INDEX: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
};

export type ActivityAttraction = {
  id?: string;
  name: string;
  description: string;
  options: string[];
  photos?: Array<{
    storage_path?: string;
    position: number;
    alt_text?: string;
  }>;
};

export type ActivityHour = {
  day: number;
  opens: string;
  closes: string;
};

export type TourInfo = {
  duration: string | null;
  language: string | null;
  meetingPointLabel: string | null;
  meetingPointUrl: string | null;
  departureMode: "weekly" | "dates" | "both";
  departures: Array<{ date: string; time: string }>;
  maxGroupSize: number | null;
};

export type ActivityInfo = {
  schedule: Record<string, { start: string; end: string }>; // Ej: { start: "09:00", end: "17:00" }
  minAge: number | null;
  whatIncludes: string[];
  attractions: ActivityAttraction[];
  hasMultipleShifts: boolean;
  hours: ActivityHour[];
  locationAddressDetails: string | null;
  tour: TourInfo | null;
};

function parseTour(raw: unknown): TourInfo {
  const tour = (raw ?? {}) as Row;
  const departures = Array.isArray(tour.departures)
    ? (tour.departures as Array<{ date?: unknown; time?: unknown }>).flatMap((departure) =>
      typeof departure.date === "string" && departure.date
        ? [{ date: departure.date, time: typeof departure.time === "string" ? departure.time : "" }]
        : [])
    : [];
  return {
    duration: text(tour.duration),
    language: text(tour.language),
    meetingPointLabel: text(tour.meetingPointLabel),
    meetingPointUrl: text(tour.meetingPointUrl),
    departureMode: tour.departureMode === "dates" || tour.departureMode === "both"
      ? tour.departureMode : "weekly",
    departures,
    maxGroupSize: typeof tour.maxGroupSize === "number" && tour.maxGroupSize > 0
      ? tour.maxGroupSize : null,
  };
}

export type ServiceDetail = {
  item: CatalogItem;
  promotions: ServicePromotion[];
  categoryLabel: string;
  address: string | null;
  mapsEmbedUrl: string | null;
  mealPlanLabel: string | null;
  photos: string[];
  amenities: Feature[];
  schedule: string[];
  rooms: Room[];
  lodging: LodgingInfo | null;
  linkedRestaurants: LinkedRestaurant[];
  restaurant: RestaurantInfo | null;
  activity: ActivityInfo | null;
  reviews: Review[];
};

type Row = Record<string, unknown>;

const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
const sortByPosition = <T extends { position: number }>(rows: T[]) =>
  [...rows].sort((a, b) => a.position - b.position);

function photoList(rows: { storage_path: string; is_cover?: boolean; position: number }[]) {
  const cover = coverPath(rows);
  return [...(cover ? [cover] : []), ...sortByPosition(rows).filter((row) => row !== cover)]
    .map((row) => publicMediaUrl(row.storage_path))
    .filter(Boolean);
}

function detailsRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value as Row)
    .filter(([, entry]) => typeof entry === "string" && entry.trim())
    .map(([key, entry]) => [key, String(entry).trim()]));
}

async function reviewAuthors(supabase: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all([...new Set(ids)].map(async (id) => {
    const { data } = await supabase.rpc("public_profile_for", { p_user_id: id });
    const name = Array.isArray(data) ? (data[0] as Row | undefined)?.display_name : null;
    return [id, typeof name === "string" && name ? name : "Cliente verificado"] as const;
  }));
  return Object.fromEntries(entries);
}

// Carga la ficha de un servicio sin importar si está publicado: la vista previa del panel la usa
// con la clave de servicio para mostrar borradores exactamente como se verían en la web.
async function linkedRestaurantRows(supabase: SupabaseClient, ids: string[]) {
  const { data } = await supabase.from("services")
    .select("id, slug, name, service_photos(storage_path, is_cover, position)").in("id", ids);
  return ((data ?? []) as Row[]).map((row) => {
    const cover = coverPath((row.service_photos ?? []) as { storage_path: string; is_cover: boolean; position: number }[]);
    return {
      id: String(row.id),
      slug: String(row.slug ?? row.id),
      name: String(row.name),
      photo: cover ? publicMediaUrl(cover.storage_path) || null : null,
    };
  });
}

export async function getServiceDetailForPreview(
  supabase: SupabaseClient,
  serviceId: string,
): Promise<ServiceDetail | null> {
  const { data: serviceRow, error: serviceError } = await supabase
    .from("services").select(SERVICE_SELECT).eq("id", serviceId).maybeSingle();
  if (serviceError || !serviceRow) return null;
  const item: CatalogItem = adaptService(serviceRow as unknown as ServiceRow);
  const [
    base,
    rooms,
    lodging,
    menu,
    restaurant,
    hours,
    reviews,
    activity,
    activityHours,
  ] = await Promise.all([
    supabase.from("services").select(`address, maps_embed_url, categories(label), meal_plans(label),
      service_photos(storage_path, is_cover, position, lodging_area_id),
      service_amenities(amenities(id, label, icon_name)),
      service_schedules(departure_time)`)
      .eq("id", item.id).maybeSingle(),
    supabase.from("room_types").select(`id, slug, name, description, capacity, beds_label,
      price_cents, total_units, bedroom_count, bathroom_count, area_m2, details, position,
      room_type_photos(storage_path, is_cover, position),
      room_type_amenities(amenities(label))`).eq("service_id", item.id).order("position"),
    supabase.from("lodging_profiles").select("*").eq("service_id", item.id).maybeSingle(),
    supabase.from("menu_sections")
      .select("id, title, position, menu_dishes(id, name, description, price_cents, position)")
      .eq("service_id", item.id).order("position"),
    supabase.from("restaurant_profiles")
      .select("*, restaurant_service_features(restaurant_feature_catalog(id, label, icon_name))")
      .eq("service_id", item.id).maybeSingle(),
    supabase.from("restaurant_hours").select("day_of_week, opens_at, closes_at, position")
      .eq("service_id", item.id).order("day_of_week").order("position"),
    supabase.from("reviews").select("id, rating, comment, customer_id")
      .eq("service_id", item.id).eq("status", "published").order("created_at", { ascending: false }),
    supabase.from("activity_profiles").select("*").eq("service_id", item.id).maybeSingle(),
    supabase.from("activity_hours").select("day_of_week, opens_at, closes_at, position")
      .eq("service_id", item.id).order("day_of_week").order("position"),
  ]);

  const service = (base.data ?? {}) as Row;
  const generalPhotos = ((service.service_photos ?? []) as {
    storage_path: string; is_cover: boolean; position: number; lodging_area_id: string | null;
  }[]).filter((photo) => !photo.lodging_area_id);

  const amenities = ((service.service_amenities ?? []) as { amenities: Row | null }[])
    .map((row) => row.amenities)
    .filter((row): row is Row => Boolean(row))
    .map((row) => ({ id: String(row.id), label: String(row.label), icon: text(row.icon_name) }));

  const lodgingRow = lodging.data as Row | null;
  const linkedIds = Array.isArray((lodgingRow?.details as Row | undefined)?.linked_restaurant_ids)
    ? ((lodgingRow?.details as Row).linked_restaurant_ids as unknown[]).map(String)
    : [];

  const restaurantRow = restaurant.data as Row | null;
  const reviewRows = (reviews.data ?? []) as Row[];
  const authors = await reviewAuthors(supabase, reviewRows.map((row) => String(row.customer_id)));
  const promotions = await getActiveServicePromotions(new Date(), item.id, supabase, { includeDrafts: true });
  const linkedRows = linkedIds.length ? await linkedRestaurantRows(supabase, linkedIds) : [];
  const promo = promotions.find((candidate) => !candidate.roomId && candidate.finalCents !== null);
  const itemWithPromo: CatalogItem = promo?.finalCents != null
    ? { ...item, promoPrice: promo.finalCents / 100, promoDiscountPct: promo.discountPct }
    : item;

  return {
    item: itemWithPromo,
    promotions,
    categoryLabel: String((service.categories as Row | null)?.label ?? item.categoryId),
    address: text(service.address),
    mapsEmbedUrl: text(service.maps_embed_url),
    mealPlanLabel: text((service.meal_plans as Row | null)?.label),
    photos: photoList(generalPhotos),
    amenities,
    schedule: ((service.service_schedules ?? []) as { departure_time: string }[])
      .map((row) => row.departure_time.slice(0, 5)).sort(),
    rooms: ((rooms.data ?? []) as Row[]).map((room) => {
      const details = detailsRecord(room.details);
      const fromTable = ((room.room_type_amenities ?? []) as { amenities: Row | null }[])
        .map((row) => text(row.amenities?.label)).filter((label): label is string => Boolean(label));
      const fromDetails = (details.amenities ?? "").split(",").map((part) => part.trim())
        .filter(Boolean);
      delete details.amenities;
      return {
        id: String(room.id),
        slug: String(room.slug ?? room.id),
        name: String(room.name),
        description: text(room.description) ?? "",
        capacity: Number(room.capacity ?? 0),
        beds: text(room.beds_label) ?? "",
        price: Number(room.price_cents ?? 0) / 100,
        totalUnits: Number(room.total_units ?? 0),
        bedroomCount: room.bedroom_count == null ? null : Number(room.bedroom_count),
        bathroomCount: room.bathroom_count == null ? null : Number(room.bathroom_count),
        areaM2: room.area_m2 == null ? null : Number(room.area_m2),
        details,
        amenities: [...new Set([...fromTable, ...fromDetails])],
        photos: photoList((room.room_type_photos ?? []) as {
          storage_path: string; is_cover: boolean; position: number;
        }[]),
      };
    }),
    lodging: lodgingRow ? {
      ...Object.fromEntries(Object.entries(lodgingRow).map(([key, value]) => [key, text(value)])),
      languages: Array.isArray(lodgingRow.languages) ? lodgingRow.languages.join(", ") : "",
    } : null,
    linkedRestaurants: linkedRows,
    restaurant: restaurantRow ? {
      tag: text(restaurantRow.tag) ?? "",
      paymentMethods: Array.isArray(restaurantRow.payment_methods)
        ? restaurantRow.payment_methods.map(String) : [],
      hoursFrom: text(restaurantRow.hours_from)?.slice(0, 5) ?? null,
      hoursTo: text(restaurantRow.hours_to)?.slice(0, 5) ?? null,
      hours: ((hours.data ?? []) as Row[]).map((row) => ({
        day: Number(row.day_of_week),
        opens: String(row.opens_at).slice(0, 5),
        closes: String(row.closes_at).slice(0, 5),
      })),
      features: ((restaurantRow.restaurant_service_features ?? []) as {
        restaurant_feature_catalog: Row | null;
      }[]).map((row) => row.restaurant_feature_catalog).filter((row): row is Row => Boolean(row))
        .map((row) => ({ id: String(row.id), label: String(row.label), icon: text(row.icon_name) })),
      menu: ((menu.data ?? []) as Row[]).map((section) => ({
        id: String(section.id),
        title: String(section.title),
        dishes: sortByPosition((section.menu_dishes ?? []) as {
          id: string; name: string; description: string | null; price_cents: number; position: number;
        }[]).map((dish) => ({
          id: dish.id,
          name: dish.name,
          description: dish.description ?? "",
          price: dish.price_cents / 100,
        })),
      })),
      cuisineType: text(restaurantRow.cuisine_type),
      serviceStyle: text(restaurantRow.service_style),
      ambience: text(restaurantRow.ambience),
      averagePriceMin: restaurantRow.average_price_min_cents == null
        ? null : Number(restaurantRow.average_price_min_cents) / 100,
      averagePriceMax: restaurantRow.average_price_max_cents == null
        ? null : Number(restaurantRow.average_price_max_cents) / 100,
      contactPhone: text(restaurantRow.contact_phone),
      contactEmail: text(restaurantRow.contact_email),
      websiteUrl: text(restaurantRow.website_url),
      menuUrl: text(restaurantRow.menu_url),
      reservationPolicy: text(restaurantRow.reservation_policy),
      cancellationPolicy: text(restaurantRow.cancellation_policy),
      acceptsReservations: restaurantRow.accepts_reservations !== false,
      minPartySize: restaurantRow.reservation_min_party_size == null
        ? null : Number(restaurantRow.reservation_min_party_size),
      maxPartySize: restaurantRow.reservation_max_party_size == null
        ? null : Number(restaurantRow.reservation_max_party_size),
    } : null,
    activity: item.categoryId === "actividades" || item.categoryId === "tour-operador"
      ? (() => {
          const activityRow = activity.data as Row | null;
          const activityHoursRows = (activityHours.data ?? []) as Row[];
          const activityDetails = (activityRow?.details ?? {}) as Row;
          const schedule = typeof activityDetails.schedule === "object" && activityDetails.schedule !== null
            ? (activityDetails.schedule as Record<string, { start: string; end: string }>)
            : {};
          const scheduleHours = Object.entries(schedule).flatMap(([day, range]) =>
            range?.start && range.end && DAY_INDEX[day] !== undefined
              ? [{ day: DAY_INDEX[day], opens: range.start.slice(0, 5), closes: range.end.slice(0, 5) }]
              : []);
          return {
            schedule,
            minAge: typeof activityDetails.minAge === "number" ? activityDetails.minAge : null,
            whatIncludes: Array.isArray(activityDetails.whatIncludes)
              ? (activityDetails.whatIncludes as string[])
              : [],
            attractions: Array.isArray(activityDetails.attractions)
              ? (activityDetails.attractions as ActivityAttraction[])
              : [],
            hasMultipleShifts: activityRow?.has_multiple_shifts === true,
            hours: activityHoursRows.length > 0
              ? activityHoursRows.map((row) => ({
                day: Number(row.day_of_week),
                opens: String(row.opens_at).slice(0, 5),
                closes: String(row.closes_at).slice(0, 5),
              }))
              : scheduleHours,
            locationAddressDetails: text(activityRow?.location_address_details),
            tour: item.categoryId === "tour-operador" ? parseTour(activityDetails.tour) : null,
          };
        })()
      : null,
    reviews: reviewRows.map((row) => ({
      id: String(row.id),
      author: authors[String(row.customer_id)] ?? "Cliente verificado",
      rating: Number(row.rating ?? 0),
      comment: text(row.comment) ?? "",
    })),
  };
}

export { formatPlace };
