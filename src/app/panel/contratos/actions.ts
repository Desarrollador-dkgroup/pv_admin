"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string; saved?: boolean };

const MAX_SIGNED_BYTES = 10 * 1024 * 1024;

function percent(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number < 100 ? number : null;
}

// El equipo crea o edita el contrato de un negocio. No se edita después de firmarlo.
export async function saveContractAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) return { error: "Tu cuenta no puede administrar contratos." };

  const businessId = formText(formData, "business_id");
  const title = formText(formData, "title");
  const templateBody = formText(formData, "template_body");
  const status = formText(formData, "status");
  const base = percent(formText(formData, "base_commission_pct"));
  const limit = percent(formText(formData, "discount_limit_pct"));
  const cap = percent(formText(formData, "commission_cap_pct"));
  const targetUsd = Number(formText(formData, "target_profit_usd"));

  if (!businessId || !title || !templateBody) return { error: "Completa el título y la plantilla." };
  if (base === null || limit === null || cap === null) {
    return { error: "Los porcentajes deben estar entre 0 y menos de 100." };
  }
  if (cap < base) return { error: "El tope de comisión no puede ser menor que la comisión base." };
  if (!Number.isFinite(targetUsd) || targetUsd < 0) {
    return { error: "La ganancia objetivo no puede ser negativa." };
  }
  if (status !== "draft" && status !== "issued") return { error: "Estado de contrato no válido." };

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from("business_contracts")
    .select("status")
    .eq("business_id", businessId)
    .maybeSingle();
  if (existing?.status === "signed") {
    return { error: "Este contrato ya está firmado y no se puede modificar." };
  }

  const { error } = await admin.from("business_contracts").upsert(
    {
      business_id: businessId,
      title,
      template_body: templateBody,
      status,
      base_commission_pct: base,
      discount_limit_pct: limit,
      commission_cap_pct: cap,
      target_profit_cents: Math.round(targetUsd * 100),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/panel/contratos");
  revalidatePath("/panel/mi-contrato");
  redirect("/panel/contratos");
}

// El propietario sube la copia firmada (PDF) de un contrato emitido de su negocio.
export async function uploadSignedContractAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { role, businessIds } = await getPanelIdentity();
  const businessId = formText(formData, "business_id");
  const allowed = canManageCatalog(role) || businessIds.includes(businessId);
  if (!allowed || !businessId) return { error: "No puedes subir un contrato de este negocio." };

  const file = formData.get("signed_pdf");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona el PDF firmado." };
  if (file.type !== "application/pdf") return { error: "El contrato firmado debe ser un PDF." };
  if (file.size > MAX_SIGNED_BYTES) return { error: "El PDF no puede pesar más de 10 MB." };

  const admin = getSupabaseAdminClient();
  const { data: contract } = await admin
    .from("business_contracts")
    .select("id, status")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!contract || contract.status === "draft") {
    return { error: "Este contrato todavía no ha sido emitido." };
  }

  const path = `${businessId}/${contract.id}.pdf`;
  const upload = await admin.storage.from("contracts").upload(path, file, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upload.error) return { error: upload.error.message };

  const { error } = await admin
    .from("business_contracts")
    .update({
      status: "signed",
      signed_pdf_path: path,
      signed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", contract.id);
  if (error) return { error: error.message };

  revalidatePath("/panel/mi-contrato");
  revalidatePath("/panel/contratos");
  return { error: "", saved: true };
}
