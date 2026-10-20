"use server";

import { extractMapsEmbedUrl } from "@/lib/panel-maps";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

// Acepta únicamente enlaces web completos para el menú público.
function httpUrl(value: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function nullable(value: string) {
  return value || null;
}

function numberValue(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// Guarda el servicio y su ficha específica con la sesión y permisos de Supabase.
export async function saveServiceAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "collaborator") {
    return { error: "El colaborador no tiene permisos para editar servicios." };
  }
  const isStaff = canManageCatalog(role);
  const serviceId = text(formData, "service_id");
  const categoryId = text(formData, "category_id");
  const businessId = text(formData, "business_id");
  const name = text(formData, "name");
  const slug = text(formData, "slug");

  if (!name || !slug || !categoryId || !text(formData, "destination_province_id")) {
    return { error: "Completa nombre, identificador, categoría y destino." };
  }
  if (!isStaff && !businessIds.includes(businessId)) {
    return { error: "Solo puedes guardar servicios de un negocio asignado." };
  }

  const { data: existing } = serviceId
    ? await supabase
        .from("services")
        .select("id, business_id, category_id, hospedaje_type_id, status")
        .eq("id", serviceId)
        .maybeSingle()
    : { data: null };

  if (serviceId && !existing) {
    return { error: "No encontramos ese servicio o no tienes permiso para editarlo." };
  }
  if (existing && !isStaff && existing.business_id !== businessId) {
    return { error: "No puedes mover un servicio a otro negocio." };
  }

  const lodgingTypeId =
    categoryId === "hospedaje" ? text(formData, "hospedaje_type_id") : "";
  if (categoryId === "hospedaje" && !lodgingTypeId) {
    return { error: "Selecciona el tipo de hospedaje." };
  }

  const weeklySchedule =
    categoryId === "restaurantes" ? parseWeeklySchedule(formData) : [];
  if (categoryId === "restaurantes" && !weeklySchedule.length) {
    return { error: "Agrega al menos un turno semanal para el restaurante." };
  }

  const mapsRaw = text(formData, "maps_embed");
  const mapsUrl = mapsRaw ? extractMapsEmbedUrl(mapsRaw) : null;
  if (mapsRaw && !mapsUrl) {
    return { error: "Ese código no es un mapa de Google válido." };
  }

  const intent = text(formData, "intent");
  const selectedStatus = text(formData, "status") || "draft";
  const serviceValues = {
    name,
    slug,
    business_id: isStaff ? businessId : existing?.business_id ?? businessId,
    category_id: categoryId,
    destination_province_id: nullable(text(formData, "destination_province_id")),
    search_description: text(formData, "search_description"),
    description: text(formData, "description"),
    address: nullable(text(formData, "address")),
    maps_embed_url: mapsUrl,
    base_price_cents: numberValue(text(formData, "base_price")) === null
      ? null
      : Math.round(Number(text(formData, "base_price")) * 100),
    hospedaje_type_id: nullable(lodgingTypeId),
    review_status: !isStaff
      ? intent === "submit" ? "pending" : "not_submitted"
      : selectedStatus === "published"
        ? "approved"
        : selectedStatus === "suspended"
          ? "rejected"
          : undefined,
    review_comment: isStaff
      ? nullable(text(formData, "review_comment"))
      : undefined,
    is_recommended: isStaff
      ? formData.get("is_recommended") === "on"
      : undefined,
    status: isStaff ? selectedStatus : "draft",
  };

  const writableValues = Object.fromEntries(
    Object.entries(serviceValues).filter(([, value]) => value !== undefined),
  );
  let savedId = serviceId;
  if (existing) {
    const { error } = await supabase
      .from("services")
      .update(writableValues)
      .eq("id", serviceId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("services")
      .insert(writableValues)
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "No se pudo crear el servicio." };
    savedId = data.id;
  }

  if (categoryId === "hospedaje") {
    const profile = {
      service_id: savedId,
      contact_phone: nullable(text(formData, "contact_phone")),
      contact_email: nullable(text(formData, "contact_email")),
      website_url: nullable(text(formData, "website_url")),
      check_in_from: nullable(text(formData, "check_in_from")),
      check_in_to: nullable(text(formData, "check_in_to")),
      check_out_time: nullable(text(formData, "check_out_time")),
      reception_hours: nullable(text(formData, "reception_hours")),
      arrival_method: nullable(text(formData, "arrival_method")),
      arrival_instructions: nullable(text(formData, "arrival_instructions")),
      languages: text(formData, "languages")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      meal_service_details: nullable(text(formData, "meal_service_details")),
      parking_details: nullable(text(formData, "parking_details")),
      accessibility_details: nullable(text(formData, "accessibility_details")),
      wifi_details: nullable(text(formData, "wifi_details")),
      water_details: nullable(text(formData, "water_details")),
      energy_details: nullable(text(formData, "energy_details")),
      seasonal_conditions: nullable(text(formData, "seasonal_conditions")),
      guest_rules: nullable(text(formData, "guest_rules")),
      pet_policy: nullable(text(formData, "pet_policy")),
      smoking_policy: nullable(text(formData, "smoking_policy")),
      events_policy: nullable(text(formData, "events_policy")),
      cancellation_policy: nullable(text(formData, "cancellation_policy")),
      tourism_registration_number: nullable(
        text(formData, "tourism_registration_number"),
      ),
      details: parseDetails(formData),
    };
    const savedProfile = await supabase
      .from("lodging_profiles")
      .upsert(profile, { onConflict: "service_id" });
    if (savedProfile.error) return { error: savedProfile.error.message };
  }

  const siteIds = formData.getAll("tourist_site_ids").map(String).filter(Boolean);
  const siteLinks = await supabase.rpc("set_service_tourist_sites", {
    p_service_id: savedId,
    p_tourist_site_ids: siteIds,
  });
  if (siteLinks.error) return { error: siteLinks.error.message };

  const amenityIds = formData.getAll("amenity_ids").map(String).filter(Boolean);
  const clearedAmenities = await supabase
    .from("service_amenities")
    .delete()
    .eq("service_id", savedId);
  if (clearedAmenities.error) return { error: clearedAmenities.error.message };
  if (amenityIds.length) {
    const savedAmenities = await supabase.from("service_amenities").insert(
      amenityIds.map((amenity_id) => ({ service_id: savedId, amenity_id })),
    );
    if (savedAmenities.error) return { error: savedAmenities.error.message };
  }

  if (categoryId === "restaurantes") {
    const menuUrlValue = text(formData, "menu_url");
    const menuUrl = httpUrl(menuUrlValue);
    if (menuUrlValue && !menuUrl) {
      return { error: "El enlace del menú debe comenzar con http:// o https://." };
    }
    const firstPeriod = weeklySchedule[0];
    const restaurant = await supabase.from("restaurant_profiles").upsert(
      {
        service_id: savedId,
        tag: text(formData, "service_style") || "casual",
        payment_methods: text(formData, "payment_methods")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        hours_from: firstPeriod.opens_at,
        hours_to: firstPeriod.closes_at,
        cuisine_type: nullable(text(formData, "cuisine_type")),
        service_style: nullable(text(formData, "service_style")),
        contact_phone: nullable(text(formData, "restaurant_phone")),
        contact_email: nullable(text(formData, "contact_email")),
        website_url: nullable(text(formData, "website_url")),
        menu_url: menuUrl,
        ambience: nullable(text(formData, "ambience")),
        accessibility_details: nullable(text(formData, "accessibility_details")),
        cancellation_policy: nullable(text(formData, "cancellation_policy")),
        average_price_min_cents: priceCents(text(formData, "average_price_min")),
        average_price_max_cents: priceCents(text(formData, "average_price_max")),
        accepts_reservations: formData.get("accepts_reservations") === "on",
        reservation_requires_confirmation:
          formData.get("reservation_requires_confirmation") === "on",
        reservation_duration_minutes: numberValue(
          text(formData, "reservation_duration_minutes"),
        ),
        reservation_min_party_size: numberValue(
          text(formData, "reservation_min_party_size"),
        ),
        reservation_max_party_size: numberValue(
          text(formData, "reservation_max_party_size"),
        ),
        reservation_min_advance_minutes: numberValue(
          text(formData, "reservation_min_advance_minutes"),
        ),
        reservation_max_days_ahead: numberValue(
          text(formData, "reservation_max_days_ahead"),
        ),
        reservation_capacity_per_slot: numberValue(
          text(formData, "reservation_capacity_per_slot"),
        ),
        reservation_cancellation_cutoff_minutes: numberValue(
          text(formData, "reservation_cancellation_cutoff_minutes"),
        ),
        reservation_policy: nullable(text(formData, "reservation_policy")),
      },
      { onConflict: "service_id" },
    );
    if (restaurant.error) return { error: restaurant.error.message };

    const clearedSchedule = await supabase
      .from("restaurant_hours")
      .delete()
      .eq("service_id", savedId);
    if (clearedSchedule.error) return { error: clearedSchedule.error.message };
    const savedSchedule = await supabase
      .from("restaurant_hours")
      .insert(weeklySchedule.map((period) => ({ ...period, service_id: savedId })));
    if (savedSchedule.error) return { error: savedSchedule.error.message };

    const featureIds = formData.getAll("restaurant_feature_ids").map(String).filter(Boolean);
    const clearedFeatures = await supabase
      .from("restaurant_service_features")
      .delete()
      .eq("service_id", savedId);
    if (clearedFeatures.error) return { error: clearedFeatures.error.message };
    if (featureIds.length) {
      const savedFeatures = await supabase.from("restaurant_service_features").insert(
        featureIds.map((feature_id) => ({ service_id: savedId, feature_id })),
      );
      if (savedFeatures.error) return { error: savedFeatures.error.message };
    }
  }

  revalidatePath("/panel");
  revalidatePath("/panel/servicios");
  redirect(`/panel/servicios/${savedId}`);
}

// Convierte los valores monetarios visibles en dólares a centavos enteros.
function priceCents(value: string) {
  const amount = numberValue(value);
  return amount === null ? null : Math.round(amount * 100);
}

// Mantiene los campos variables por tipo de hospedaje dentro del objeto JSON.
function parseDetails(formData: FormData) {
  const entries = [...formData.entries()].filter(([key]) => key.startsWith("detail__"));
  return Object.fromEntries(
    entries.map(([key, value]) => [key.slice("detail__".length), String(value).trim()]),
  );
}

// Convierte los turnos por día al formato relacional de restaurant_hours.
function parseWeeklySchedule(formData: FormData) {
  const periods: Array<{
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    position: number;
  }> = [];

  for (let day = 0; day <= 6; day += 1) {
    const entries = text(formData, `hours_${day}`)
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    for (const [position, entry] of entries.entries()) {
      const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(entry);
      if (!match || match[1] === match[2]) return [];
      periods.push({
        day_of_week: day,
        opens_at: `${match[1]}:00`,
        closes_at: `${match[2]}:00`,
        position,
      });
    }
  }

  return periods;
}
