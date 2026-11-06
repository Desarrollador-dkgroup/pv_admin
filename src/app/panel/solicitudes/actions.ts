"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

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
