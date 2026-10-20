"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";

type FormState = { error: string };

// El propietario prepara una ficha borrador para un cupo libre de su plan de servicios.
// owner_create_draft_service vuelve a comprobar membresía, suspensión y cupo disponible
// dentro de una transacción, así que dos clics simultáneos no pueden exceder el plan.
export async function prepareDraftServiceAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role !== "propietario") {
    return { error: "Esta acción es solo para propietarios de negocio." };
  }

  const businessId = formText(formData, "business_id");
  const categoryId = formText(formData, "category_id");
  const hospedajeTypeId = formText(formData, "hospedaje_type_id") || null;
  if (!businessIds.includes(businessId)) {
    return { error: "No puedes preparar una ficha para ese negocio." };
  }
  if (!categoryId) {
    return { error: "Falta la categoría del cupo a preparar." };
  }

  const { data: newId, error } = await supabase.rpc("owner_create_draft_service", {
    p_business_id: businessId,
    p_category_id: categoryId,
    p_hospedaje_type_id: hospedajeTypeId,
  });
  if (error || !newId) {
    return { error: error?.message ?? "No se pudo preparar la ficha." };
  }

  revalidatePath("/panel/servicios");
  revalidatePath("/panel");
  redirect(
    categoryId === "hospedaje"
      ? `/panel/servicios/${newId}/portada`
      : `/panel/servicios/${newId}`,
  );
}
