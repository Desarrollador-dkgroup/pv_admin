"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { slugCandidates, slugify } from "@/lib/panel-slug";
import {
  dollarsToCents,
  formChecked,
  formText,
  linesToList,
  nullableText,
  panamaDateTimeToIso,
} from "@/lib/panel-form";
import { DESTINATION_KINDS, type DestinationKind } from "@/lib/panel-promotion-options";
import { canManageCatalog } from "@/types/panel";
import { validatePromotionPrices, type PromotionContent } from "@/types/content";

type FormState = { error: string };


// Traduce la selección "tipo:identificador" a las columnas de destino de la tabla.
// Solo la columna del tipo elegido recibe valor; las demás quedan vacías.
function destinationColumns(ref: string) {
  const [kind, id] = ref.split(":");
  if (!DESTINATION_KINDS.includes(kind as DestinationKind) || !id) return null;
  return {
    destination_kind: kind,
    destination_service_id: kind === "service" ? id : null,
    destination_province_id: kind === "province" ? id : null,
    destination_category_id: kind === "category" ? id : null,
  };
}

// Crea o actualiza una promoción. El porcentaje lo calcula PostgreSQL, no el formulario.
export async function savePromotionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Tu cuenta no puede administrar promociones." };

  const promotionId = formText(formData, "promotion_id");
  const title = formText(formData, "title");
  const placeName = formText(formData, "place_name");
  const periodLabel = formText(formData, "period_label");
  const discountValue = formText(formData, "discount_value");
  const photoPath = formText(formData, "photo_storage_path");
  const destination = destinationColumns(formText(formData, "destination_ref"));

  if (!title || !placeName || !periodLabel || !discountValue || !photoPath) {
    return { error: "Completa título, lugar, vigencia, descuento y la ruta de la imagen." };
  }
  if (!destination) return { error: "Selecciona el destino de la promoción." };

  const validFrom = panamaDateTimeToIso(formText(formData, "valid_from"));
  const validTo = panamaDateTimeToIso(formText(formData, "valid_to"));
  if (!validFrom || !validTo || new Date(validTo) <= new Date(validFrom)) {
    return { error: "La fecha de fin debe ser posterior a la fecha de inicio." };
  }

  // Los precios se guardan en centavos; validatePromotionPrices aplica las mismas reglas
  // que el contrato compartido con la web pública.
  const content: PromotionContent = {
    description: nullableText(formText(formData, "description")),
    conditions: nullableText(formText(formData, "conditions")),
    inclusions: linesToList(formText(formData, "inclusions")),
    exclusions: linesToList(formText(formData, "exclusions")),
    schedule_details: nullableText(formText(formData, "schedule_details")),
    regular_price_cents: dollarsToCents(formText(formData, "regular_price")),
    promotional_price_cents: dollarsToCents(formText(formData, "promotional_price")),
    currency: "USD",
  };
  try {
    validatePromotionPrices(content);
  } catch (failure) {
    return { error: failure instanceof Error ? failure.message : "Precios no válidos." };
  }

  const values = {
    ...content,
    ...destination,
    title,
    place_name: placeName,
    eyebrow: formText(formData, "eyebrow"),
    tags: formText(formData, "tags"),
    period_label: periodLabel,
    discount_value: discountValue,
    discount_suffix: formText(formData, "discount_suffix"),
    price_line: nullableText(formText(formData, "price_line")),
    photo_storage_path: photoPath,
    photo_is_illustrative: formChecked(formData, "photo_is_illustrative"),
    valid_from: validFrom,
    valid_to: validTo,
    is_published: formChecked(formData, "is_published"),
    sort_order: Number(formText(formData, "sort_order") || "0"),
    updated_at: new Date().toISOString(),
  };

  // El identificador sale del título; si ya existe, se prueba con un sufijo corto.
  const candidates = promotionId ? [] : slugCandidates(slugify(title, "promocion"));
  let result = promotionId
    ? await supabase.from("promotions").update(values).eq("id", promotionId)
    : await supabase.from("promotions").insert({ ...values, slug: candidates[0] });
  for (const slug of candidates.slice(1)) {
    if (!result.error || !result.error.message.includes("duplicate")) break;
    result = await supabase.from("promotions").insert({ ...values, slug });
  }
  if (result.error) {
    const duplicated = result.error.message.includes("duplicate");
    return {
      error: duplicated ? "Ya existe una promoción con ese identificador." : result.error.message,
    };
  }

  revalidatePath("/panel/promociones");
  revalidatePath("/panel");
  revalidatePath("/panel/notificaciones");
  // Tras guardar, la misma pestaña vuelve al listado.
  redirect("/panel/promociones");
}
