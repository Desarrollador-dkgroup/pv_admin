"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { canManageProviders } from "@/lib/panel-permissions";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string; saved?: boolean };

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function refreshAdViews() {
  revalidatePath("/panel/anuncios");
  revalidatePath("/panel/contratos");
  revalidatePath("/panel");
  revalidatePath("/panel/notificaciones");
}

// El propietario pide un anuncio para una de sus promociones. El equipo lo gestiona después.
export async function requestAdAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { role, businessIds, user } = await getPanelIdentity();
  if (role !== "propietario") return { error: "Solo los propietarios piden anuncios desde su cuenta." };

  const businessId = formText(formData, "business_id");
  if (!businessIds.includes(businessId)) return { error: "No puedes pedir anuncios para este negocio." };

  const title = formText(formData, "title");
  const promotionId = formText(formData, "service_promotion_id");
  const startsOn = formText(formData, "starts_on") || null;
  const endsOn = formText(formData, "ends_on") || null;
  const notes = formText(formData, "notes") || null;
  const image = formData.get("image");

  if (title.length < 2) return { error: "Escribe un título para el anuncio." };
  if (!promotionId) return { error: "Elige la promoción a la que lleva el anuncio." };
  if (!(image instanceof File) || image.size === 0) return { error: "Sube la imagen del anuncio." };
  const extension = IMAGE_EXTENSIONS[image.type];
  if (!extension) return { error: "La imagen debe ser JPG, PNG o WEBP." };
  if (image.size > MAX_IMAGE_BYTES) return { error: "La imagen no puede pesar más de 5 MB." };
  if (startsOn && endsOn && endsOn < startsOn) {
    return { error: "La fecha de fin debe ser posterior a la de inicio." };
  }

  const admin = getSupabaseAdminClient();
  // La promoción debe ser de un servicio de este negocio.
  const { data: promotion } = await admin
    .from("service_promotions")
    .select("id, services!inner(business_id)")
    .eq("id", promotionId)
    .maybeSingle();
  const owner = promotion?.services as unknown as { business_id: string } | null;
  if (!promotion || owner?.business_id !== businessId) {
    return { error: "Esa promoción no pertenece a tu negocio." };
  }

  const path = `${randomUUID()}.${extension}`;
  const upload = await admin.storage.from("ads-media").upload(path, image, {
    contentType: image.type,
    upsert: false,
  });
  if (upload.error) return { error: "No se pudo subir la imagen. Intenta de nuevo." };

  const { error } = await admin.from("ad_requests").insert({
    business_id: businessId,
    requested_by: user.id,
    title,
    image_path: path,
    service_promotion_id: promotionId,
    starts_on: startsOn,
    ends_on: endsOn,
    notes,
    status: "solicitado",
  });
  if (error) {
    await admin.storage.from("ads-media").remove([path]);
    return { error: "No se pudo enviar la solicitud. Intenta de nuevo." };
  }

  refreshAdViews();
  return { error: "", saved: true };
}

// El equipo toma la solicitud para gestionarla con el departamento correspondiente.
export async function takeAdRequestAction(formData: FormData) {
  const { role } = await getPanelIdentity();
  if (!canManageProviders(role)) throw new Error("Tu cuenta no gestiona anuncios.");
  const requestId = formText(formData, "request_id");
  const admin = getSupabaseAdminClient();
  await admin
    .from("ad_requests")
    .update({ status: "en_gestion", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("status", "solicitado");
  refreshAdViews();
}

// El equipo rechaza una solicitud con un motivo que verá el propietario.
export async function rejectAdRequestAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { role } = await getPanelIdentity();
  if (!canManageProviders(role)) return { error: "Tu cuenta no gestiona anuncios." };
  const requestId = formText(formData, "request_id");
  const reason = formText(formData, "rejection_reason");
  if (!reason) return { error: "Escribe el motivo para que el propietario lo entienda." };
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("ad_requests")
    .update({ status: "rechazado", rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .in("status", ["solicitado", "en_gestion"]);
  if (error) return { error: "No se pudo rechazar la solicitud." };
  refreshAdViews();
  return { error: "", saved: true };
}

// El departamento sube el documento del anuncio (PDF) en Contratos. Queda listo para crear el anuncio.
export async function uploadAdDocumentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Solo el administrador sube documentos de anuncios." };
  const requestId = formText(formData, "request_id");
  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona el PDF del anuncio." };
  if (file.type !== "application/pdf") return { error: "El documento debe ser un PDF." };
  if (file.size > MAX_DOCUMENT_BYTES) return { error: "El PDF no puede pesar más de 10 MB." };

  const admin = getSupabaseAdminClient();
  const { data: request } = await admin
    .from("ad_requests")
    .select("id, status")
    .eq("id", requestId)
    .maybeSingle();
  if (!request || !["en_gestion", "documento_listo"].includes(request.status)) {
    return { error: "Esta solicitud no está en gestión." };
  }

  const path = `anuncios/${requestId}.pdf`;
  const upload = await admin.storage.from("contracts").upload(path, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upload.error) return { error: "No se pudo subir el documento." };

  const { error } = await admin
    .from("ad_requests")
    .update({ document_path: path, status: "documento_listo", updated_at: new Date().toISOString() })
    .eq("id", requestId);
  if (error) return { error: "No se pudo guardar el documento." };
  refreshAdViews();
  return { error: "", saved: true };
}

