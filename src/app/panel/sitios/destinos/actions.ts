"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText, nullableText } from "@/lib/panel-form";
import { slugFromProvince } from "@/lib/panel-destinations";
import { extractMapsEmbedUrl } from "@/lib/panel-maps";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Crea o actualiza la tarjeta de un destino. La provincia no cambia después de crearla.
export async function saveDestinationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Tu cuenta no puede administrar destinos." };

  const destinationId = formText(formData, "destination_id");
  const provinceId = formText(formData, "province_id");
  const name = formText(formData, "name");
  const subtitle = nullableText(formText(formData, "subtitle"));
  const description = nullableText(formText(formData, "description"));
  const cardImagePath = nullableText(formText(formData, "card_image_storage_path"));
  const bannerImagePath = nullableText(formText(formData, "banner_image_storage_path"));
  const mapsInput = formText(formData, "maps_embed");

  if (!UUID_PATTERN.test(destinationId)) {
    return { error: "No se pudo identificar el destino. Recarga la página." };
  }
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }
  if (subtitle && subtitle.length > 120) {
    return { error: "El subtítulo no puede pasar de 120 caracteres." };
  }
  const imagePaths = [cardImagePath, bannerImagePath].filter((path): path is string => !!path);
  if (imagePaths.some((path) => !path.startsWith(`${destinationId}/`))) {
    return { error: "Una imagen no pertenece a este destino. Súbela de nuevo." };
  }

  let mapsUrl: string | null = null;
  if (mapsInput) {
    mapsUrl = extractMapsEmbedUrl(mapsInput);
    if (!mapsUrl) {
      return {
        error: "El mapa debe ser el código de inserción de Google Maps o su URL de embed.",
      };
    }
  }

  const values = {
    name,
    subtitle,
    description,
    card_image_storage_path: cardImagePath,
    banner_image_storage_path: bannerImagePath,
    maps_embed_url: mapsUrl,
    updated_at: new Date().toISOString(),
  };

  const existing = await supabase
    .from("destinations")
    .select("id")
    .eq("id", destinationId)
    .maybeSingle();
  if (existing.error) return { error: "No se pudo leer el destino. Intenta de nuevo." };

  let result;
  if (existing.data) {
    result = await supabase.from("destinations").update(values).eq("id", destinationId);
  } else {
    if (!provinceId) return { error: "Selecciona la provincia del destino." };
    result = await supabase.from("destinations").insert({
      ...values,
      id: destinationId,
      province_id: provinceId,
      slug: slugFromProvince(provinceId),
    });
  }
  if (result.error) {
    const duplicated = result.error.message.includes("duplicate");
    return {
      error: duplicated
        ? "Esa provincia ya tiene un destino."
        : "No se pudo guardar el destino. Intenta de nuevo.",
    };
  }

  revalidatePath("/panel/sitios");
  revalidatePath(`/panel/sitios/destinos/${destinationId}`);
  redirect(`/panel/sitios/destinos/${destinationId}`);
}
