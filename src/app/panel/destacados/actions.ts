"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { canManageCatalog } from "@/types/panel";

// Marca o quita un servicio como destacado. Solo el equipo decide qué destacar.
export async function setFeaturedAction(formData: FormData): Promise<void> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageCatalog(role)) throw new Error("Solo el equipo puede destacar servicios.");

  const serviceId = formText(formData, "service_id");
  const featured = formData.get("featured") === "true";
  const { error } = await supabase
    .from("services")
    .update({ is_recommended: featured, updated_at: new Date().toISOString() })
    .eq("id", serviceId);
  if (error) throw new Error("No se pudo actualizar el destacado.");

  revalidatePath("/panel/destacados");
  revalidatePath("/panel/servicios");
}
