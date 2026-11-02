"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formChecked, formText } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Crea un anuncio. Solo el equipo puede administrar anuncios.
export async function createAdAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Tu cuenta no puede administrar anuncios." };

  const title = formText(formData, "title");
  const promotionId = formText(formData, "service_promotion_id") || null;
  const startsOn = formText(formData, "starts_on") || null;
  const endsOn = formText(formData, "ends_on") || null;
  const image = formData.get("image");

  if (!title) return { error: "Escribe un título para el anuncio." };
  if (!(image instanceof File) || image.size === 0) return { error: "Selecciona la imagen del anuncio." };
  const extension = IMAGE_EXTENSIONS[image.type];
  if (!extension) return { error: "La imagen debe ser JPG, PNG o WEBP." };
  if (image.size > MAX_IMAGE_BYTES) return { error: "La imagen no puede pesar más de 5 MB." };
  if (startsOn && endsOn && endsOn < startsOn) {
    return { error: "La fecha de fin debe ser posterior a la de inicio." };
  }

  const admin = getSupabaseAdminClient();
  if (promotionId) {
    const { data: promotion } = await admin
      .from("service_promotions")
      .select("id")
      .eq("id", promotionId)
      .maybeSingle();
    if (!promotion) return { error: "La promoción seleccionada no existe." };
  }

  const path = `${randomUUID()}.${extension}`;
  const upload = await admin.storage.from("ads-media").upload(path, image, {
    contentType: image.type,
    upsert: false,
  });
  if (upload.error) return { error: upload.error.message };

  const { data: last } = await admin
    .from("ads")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await admin.from("ads").insert({
    title,
    image_path: path,
    service_promotion_id: promotionId,
    starts_on: startsOn,
    ends_on: endsOn,
    is_active: formChecked(formData, "is_active"),
    position: (last?.position ?? 0) + 1,
  });
  if (error) return { error: error.message };

  revalidatePath("/panel/anuncios");
  revalidatePath("/");
  redirect("/panel/anuncios");
}

// Sube o baja un anuncio intercambiando su posición con el vecino.
export async function moveAdAction(formData: FormData) {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return;
  const adId = formText(formData, "ad_id");
  const direction = formText(formData, "direction") === "up" ? -1 : 1;

  const admin = getSupabaseAdminClient();
  const { data: ads } = await admin.from("ads").select("id, position").order("position");
  const list = ads ?? [];
  const index = list.findIndex((ad) => ad.id === adId);
  const neighbor = list[index + direction];
  if (index < 0 || !neighbor) return;

  const current = list[index];
  await admin.from("ads").update({ position: neighbor.position }).eq("id", current.id);
  await admin.from("ads").update({ position: current.position }).eq("id", neighbor.id);
  revalidatePath("/panel/anuncios");
  revalidatePath("/");
}

export async function setAdActiveAction(formData: FormData) {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return;
  const admin = getSupabaseAdminClient();
  await admin
    .from("ads")
    .update({
      is_active: formText(formData, "next_active") === "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", formText(formData, "ad_id"));
  revalidatePath("/panel/anuncios");
  revalidatePath("/");
}

export async function deleteAdAction(formData: FormData) {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return;
  const admin = getSupabaseAdminClient();
  const adId = formText(formData, "ad_id");
  const { data: ad } = await admin.from("ads").select("image_path").eq("id", adId).maybeSingle();
  if (!ad) return;
  await admin.from("ads").delete().eq("id", adId);
  await admin.storage.from("ads-media").remove([ad.image_path]);
  revalidatePath("/panel/anuncios");
  revalidatePath("/");
}
