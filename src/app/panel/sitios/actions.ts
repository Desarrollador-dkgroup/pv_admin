"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText, nullableText } from "@/lib/panel-form";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";
import { sitePhotosError } from "@/lib/panel-sites";
import { slugCandidates, slugify } from "@/lib/panel-slug";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

// Identificador de sitio en formato UUID, igual que el de Supabase.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

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
  const description = formText(formData, "description");
  const provinceId = formText(formData, "province_id");
  const sortOrder = Number(formText(formData, "sort_order") || "0");

  // Galería en el orden del formulario; la primera es la portada.
  const photos = formData.getAll("photos")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  const mapsRaw = formText(formData, "maps_embed");
  const mapsUrl = mapsRaw ? extractMapsEmbedUrl(mapsRaw) : null;

  if (!name || !description) return { error: "Completa el nombre y la descripción del sitio." };
  // Las fotos que el sitio ya tenía se aceptan aunque no estén en su carpeta (catálogo inicial).
  const current = isNew
    ? []
    : ((await supabase.from("tourist_site_photos").select("storage_path")
      .eq("tourist_site_id", siteId)).data ?? []).map((row) => row.storage_path as string);
  const photosError = sitePhotosError(photos, siteId, current);
  if (photosError) return { error: photosError };
  if (mapsRaw && !mapsUrl) return { error: "Ese código no es un mapa de Google válido." };
  if (!provinceId) return { error: "Selecciona la provincia destino del sitio." };
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 32767) {
    return { error: "El orden debe ser un número entero positivo." };
  }

  const values = {
    name,
    description,
    short_description: nullableText(formText(formData, "short_description")),
    province_id: provinceId,
    sort_order: sortOrder,
    maps_embed_url: mapsUrl,
    updated_at: new Date().toISOString(),
  };

  if (!isNew) {
    const updated = await supabase.from("tourist_sites").update(values).eq("id", siteId);
    if (updated.error) return { error: updated.error.message };
  } else {
    // El identificador sale del nombre; si ya existe, se prueba con un sufijo corto.
    let inserted = false;
    for (const slug of slugCandidates(slugify(name, "sitio"))) {
      const created = await supabase
        .from("tourist_sites")
        .insert({ id: siteId, ...values, slug });
      if (!created.error) {
        inserted = true;
        break;
      }
      if (!created.error.message.includes("duplicate")) return { error: created.error.message };
    }
    if (!inserted) return { error: "No se pudo crear el identificador del sitio." };
  }

  // Guarda la galería y copia la primera foto como portada, en una sola operación.
  const savedPhotos = await supabase.rpc("padmin_set_tourist_site_photos", {
    p_site_id: siteId,
    p_paths: photos,
  });
  if (savedPhotos.error) {
    return { error: "Se guardó el sitio, pero no sus fotos. Intenta de nuevo." };
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

// Elimina un sitio turístico. Solo el propietario principal y los admins.
export async function deleteTouristSiteAction(siteId: string): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Tu cuenta no puede administrar sitios." };

  if (!UUID_PATTERN.test(siteId)) return { error: "No se reconoce el sitio." };

  const deleted = await supabase.from("tourist_sites").delete().eq("id", siteId);
  if (deleted.error) return { error: deleted.error.message };

  revalidatePath("/panel/sitios");
  revalidatePath("/panel");
  redirect("/panel/sitios");
}
