"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

// Elimina una solicitud de negocio. La confirmación se pide en la pantalla antes de llamar aquí.
export async function deleteLeadAction(formData: FormData) {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return;
  await getSupabaseAdminClient()
    .from("business_leads")
    .delete()
    .eq("id", formText(formData, "lead_id"));
  revalidatePath("/panel/solicitudes");
}

// Marca una solicitud de negocio como nuevo, contactado o descartado.
export async function setLeadStatusAction(formData: FormData) {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return;
  const status = formText(formData, "status");
  if (status !== "nuevo" && status !== "contactado" && status !== "descartado") return;
  await getSupabaseAdminClient()
    .from("business_leads")
    .update({ status })
    .eq("id", formText(formData, "lead_id"));
  revalidatePath("/panel/solicitudes");
}
