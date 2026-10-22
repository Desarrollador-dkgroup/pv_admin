"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageProviders } from "@/lib/panel-permissions";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

// El propietario principal, los admins y los colaboradores aprueban o rechazan servicios.
async function requireReviewAccess() {
  const identity = await getPanelIdentity();
  if (!canManageProviders(identity.role)) {
    throw new Error("Tu cuenta no tiene permiso para revisar servicios.");
  }
  return identity;
}

// Actualiza las vistas que dependen del estado de revisión.
function refreshReviewViews() {
  revalidatePath("/panel");
  revalidatePath("/panel/revision");
  revalidatePath("/panel/servicios");
  revalidatePath("/panel/notificaciones");
}

// Aprueba un servicio pendiente: el propietario decide cuándo publicarlo.
export async function approveServiceAction(formData: FormData): Promise<void> {
  const { supabase, role } = await requireReviewAccess();
  const serviceId = String(formData.get("service_id") ?? "");

  // El colaborador no edita servicios: revisa mediante una función de la base.
  if (!canManageCatalog(role)) {
    const { error } = await supabase.rpc("padmin_review_service", {
      p_service_id: serviceId,
      p_decision: "approved",
    });
    if (error) throw new Error(error.message);
    refreshReviewViews();
    return;
  }

  // Solo cambia servicios que siguen pendientes, para no pisar una revisión ya hecha.
  const { error } = await supabase
    .from("services")
    .update({ review_status: "approved", review_comment: null })
    .eq("id", serviceId)
    .eq("review_status", "pending");
  if (error) throw new Error(error.message);

  refreshReviewViews();
}

// Devuelve un servicio al negocio con un motivo claro para que lo corrija.
export async function requestChangesAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await requireReviewAccess();
  const serviceId = String(formData.get("service_id") ?? "");
  const comment = String(formData.get("review_comment") ?? "").trim();

  if (!comment) {
    return { error: "Escribe el motivo para que el negocio pueda corregirlo." };
  }

  if (!canManageCatalog(role)) {
    const { error } = await supabase.rpc("padmin_review_service", {
      p_service_id: serviceId,
      p_decision: "rejected",
      p_comment: comment,
    });
    if (error) return { error: error.message };
    refreshReviewViews();
    return { error: "" };
  }

  // El servicio regresa a borrador para que el negocio lo edite y vuelva a enviarlo.
  const { error } = await supabase
    .from("services")
    .update({ review_status: "rejected", status: "draft", review_comment: comment })
    .eq("id", serviceId)
    .eq("review_status", "pending");
  if (error) return { error: error.message };

  refreshReviewViews();
  return { error: "" };
}
