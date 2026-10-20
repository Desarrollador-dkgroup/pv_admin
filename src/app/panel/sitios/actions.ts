"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText, nullableText } from "@/lib/panel-form";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";
import { isSitePhotoUrl } from "@/lib/panel-sites";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

// Un identificador de URL solo admite minúsculas, números y guiones.
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Identificador de sitio en formato UUID, igual que el de Supabase.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Convierte una coordenada opcional; undefined si el texto no es un número dentro del rango.
function coordinate(value: string, limit: number): number | null | undefined {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > limit) return undefined;
  return parsed;
}

// Crea o actualiza un sitio turístico. Solo el propietario principal y los admins.
export async function saveTouristSiteAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Tu cuenta no puede administrar sitios." };

  const isNew = formText(formData, "is_new") === "1";
  // Un sitio nuevo puede no tener identificador si nunca subió una foto; se crea aquí.
  const siteId = isNew
    ? formText(formData, "site_id") || crypto.randomUUID()
    : formText(formData, "site_id");
  if (!UUID_PATTERN.test(siteId)) return { error: "No se reconoce el sitio. Vuelve a abrirlo." };
  const name = formText(formData, "name");
  const slug = formText(formData, "slug");
  const description = formText(formData, "description");
  const provinceId = formText(formData, "province_id");
  const sortOrder = Number(formText(formData, "sort_order") || "0");
  const latitude = coordinate(formText(formData, "latitude"), 90);
  const longitude = coordinate(formText(formData, "longitude"), 180);

  const photo = formText(formData, "photo_storage_path");
  const mapsRaw = formText(formData, "maps_embed");
  const mapsUrl = mapsRaw ? extractMapsEmbedUrl(mapsRaw) : null;

  if (!name || !description) return { error: "Completa el nombre y la descripción del sitio." };
  if (photo && !isSitePhotoUrl(photo, siteId)) {
    return { error: "La foto no pertenece a este sitio. Vuelve a subirla." };
  }
  if (mapsRaw && !mapsUrl) return { error: "Ese código no es un mapa de Google válido." };
  if (!SLUG_PATTERN.test(slug)) {
    return { error: "El identificador solo puede tener minúsculas, números y guiones." };
  }
  if (!provinceId) return { error: "Selecciona la provincia destino del sitio." };
  if (latitude === undefined || longitude === undefined) {
    return { error: "La latitud debe estar entre -90 y 90, y la longitud entre -180 y 180." };
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 32767) {
    return { error: "El orden debe ser un número entero positivo." };
  }

  const values = {
    name,
    slug,
    description,
    short_description: nullableText(formText(formData, "short_description")),
    province_id: provinceId,
    city_id: nullableText(formText(formData, "city_id")),
    latitude,
    longitude,
    sort_order: sortOrder,
    photo_storage_path: photo || null,
    maps_embed_url: mapsUrl,
    updated_at: new Date().toISOString(),
  };

  const result = isNew
    ? await supabase.from("tourist_sites").insert({ id: siteId, ...values })
    : await supabase.from("tourist_sites").update(values).eq("id", siteId);
  if (result.error) {
    const duplicated = result.error.message.includes("duplicate");
    return {
      error: duplicated ? "Ya existe un sitio con ese identificador." : result.error.message,
    };
  }

  revalidatePath("/panel/sitios");
  revalidatePath("/panel");
  if (!isNew) {
    revalidatePath(`/panel/sitios/${siteId}`);
    // Tras editar, vuelve a la ficha del sitio; redirect lanza una excepción esperada.
    redirect(`/panel/sitios/${siteId}`);
  }
  // Tras crear, vuelve al destino de su provincia para ver el sitio en su lista.
  const destination = await supabase
    .from("destinations")
    .select("id")
    .eq("province_id", provinceId)
    .maybeSingle();
  const destinationId = destination.data?.id as string | undefined;
  redirect(destinationId ? `/panel/sitios/destinos/${destinationId}` : "/panel/sitios");
}
