"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

// Marca una sugerencia como leída o archivada.
export async function setSuggestionStatusAction(formData: FormData) {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return;
  const status = formText(formData, "status");
  if (status !== "read" && status !== "archived") return;
  await getSupabaseAdminClient()
    .from("suggestions")
    .update({ status })
    .eq("id", formText(formData, "suggestion_id"));
  revalidatePath("/panel/sugerencias");
}
