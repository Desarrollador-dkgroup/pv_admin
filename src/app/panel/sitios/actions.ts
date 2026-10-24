"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText, nullableText } from "@/lib/panel-form";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";
import { isSitePhotoUrl } from "@/lib/panel-sites";
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

  const photo = formText(formData, "photo_storage_path");
  const mapsRaw = formText(formData, "maps_embed");
  const mapsUrl = mapsRaw ? extractMapsEmbedUrl(mapsRaw) : null;

  if (!name || !description) return { error: "Completa el nombre y la descripción del sitio." };
  if (photo && !isSitePhotoUrl(photo, siteId)) {
    // Los sitios del catálogo inicial guardan una ruta de `catalog-photos`; se acepta si no cambió.
    const current = isNew
      ? null
      : await supabase.from("tourist_sites").select("photo_storage_path").eq("id", siteId)
        .maybeSingle();
    if (current?.data?.photo_storage_path !== photo) {
      return { error: "La foto no pertenece a este sitio. Vuelve a subirla." };
    }
  }
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
    photo_storage_path: photo || null,
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
