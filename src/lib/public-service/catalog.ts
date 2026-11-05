import { publicMediaUrl } from "@/lib/public-service/storage";

// Catálogo público con la forma que usan las pantallas copiadas de la app móvil.
// Los precios llegan en centavos y aquí se pasan a dólares una sola vez.

export type CatalogCategory = {
  id: string;
  label: string;
  resultsNoun: string;
  resultsNounSingular: string;
  priceUnit: "per_night" | "per_person_avg" | "per_person" | "from";
};

export type CatalogItem = {
  id: string;
  slug: string;
  categoryId: string;
  name: string;
  searchDescription: string;
  description: string;
  isRecommended: boolean;
  photo: string | null;
  price: number;
  promoPrice: number | null;
  promoDiscountPct: number | null;
  rating: number;
  ratingCount: number;
  provinceId: string | null;
  siteId: string | null;
  siteName: string | null;
  siteSlug: string | null;
  siteIds: string[];
  hospedajeTypeId: string | null;
  hospedajeTypeLabel: string | null;
  mealPlanId: string | null;
  amenityIds: string[];
};

export type CatalogSite = {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  provinceId: string | null;
  regionId: string;
  zoneId: string | null;
  photo: string | null;
  photoIsIllustrative: boolean;
  mapsEmbedUrl: string | null;
};

export type CatalogDestination = {
  id: string;
  slug: string;
  provinceId: string;
  name: string;
  subtitle: string;
  description: string;
  cardImage: string | null;
  bannerImage: string | null;
  mapsEmbedUrl: string | null;
};

export type ServiceRow = {
  id: string;
  slug: string | null;
  category_id: string;
  name: string;
  search_description: string | null;
  description: string | null;
  is_recommended: boolean;
  base_price_cents: number | null;
  cached_price_from_cents: number | null;
  rating_avg: number | string | null;
  rating_count: number | null;
  destination_province_id: string | null;
  tourist_site_id: string | null;
  hospedaje_type_id: string | null;
  meal_plan_id: string | null;
  hospedaje_types: { label: string } | null;
  tourist_sites: { slug: string; name: string; province_id: string | null } | null;
  service_photos: { storage_path: string; is_cover: boolean; position: number }[];
  service_amenities: { amenity_id: string }[];
  service_tourist_sites: { tourist_site_id: string }[];
};

export const SERVICE_SELECT = `
  id, slug, category_id, name, search_description, description, is_recommended,
  base_price_cents, cached_price_from_cents, rating_avg, rating_count,
  destination_province_id, tourist_site_id, hospedaje_type_id, meal_plan_id,
  hospedaje_types(label),
  tourist_sites!services_tourist_site_id_fkey(slug, name, province_id),
  service_photos(storage_path, is_cover, position),
  service_amenities(amenity_id),
  service_tourist_sites(tourist_site_id)
`;

// Elige la portada: la marcada como tal o la primera por posición.
export function coverPath<T extends { is_cover?: boolean; position: number }>(photos: T[]) {
  return [...photos].sort((a, b) =>
    Number(Boolean(b.is_cover)) - Number(Boolean(a.is_cover)) || a.position - b.position)[0];
}

export function adaptService(row: ServiceRow): CatalogItem {
  const cover = coverPath(row.service_photos ?? []);
  const priceCents = row.cached_price_from_cents ?? row.base_price_cents ?? 0;
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    categoryId: row.category_id,
    name: row.name,
    searchDescription: row.search_description ?? "",
    description: row.description ?? "",
    isRecommended: row.is_recommended,
    photo: cover ? publicMediaUrl(cover.storage_path) || null : null,
    price: priceCents / 100,
    promoPrice: null,
    promoDiscountPct: null,
    rating: Number(row.rating_avg ?? 0),
    ratingCount: row.rating_count ?? 0,
    provinceId: row.destination_province_id ?? row.tourist_sites?.province_id ?? null,
    siteId: row.tourist_site_id,
    siteName: row.tourist_sites?.name ?? null,
    siteSlug: row.tourist_sites?.slug ?? null,
    siteIds: [
      ...new Set([
        ...(row.tourist_site_id ? [row.tourist_site_id] : []),
        ...(row.service_tourist_sites ?? []).map((link) => link.tourist_site_id),
      ]),
    ],
    hospedajeTypeId: row.hospedaje_type_id,
    hospedajeTypeLabel: row.hospedaje_types?.label ?? null,
    mealPlanId: row.meal_plan_id,
    amenityIds: (row.service_amenities ?? []).map((amenity) => amenity.amenity_id),
  };
}

// Lugar que se muestra bajo el nombre: "sitio, provincia" o solo la provincia.
export function formatPlace(item: Pick<CatalogItem, "siteName" | "provinceId">): string {
  if (item.siteName && item.provinceId && item.siteName !== item.provinceId) {
    return `${item.siteName}, ${item.provinceId}`;
  }
  return item.siteName ?? item.provinceId ?? "Panamá";
}

