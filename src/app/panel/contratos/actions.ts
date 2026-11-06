"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { CONTRACT_FIELDS, missingContractKeys, type ContractValues } from "@/lib/panel-contracts";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string; saved?: boolean };

// Valores de los campos del generador (`field_<clave>`) validados según su tipo.
function readContractFields(formData: FormData): { values: Record<string, string>; error: string } {
  const values: Record<string, string> = {};
  for (const field of CONTRACT_FIELDS) {
    const value = formText(formData, `field_${field.key}`);
    if (field.kind === "number" && value !== "") {
      const number = Number(value);
      if (!Number.isFinite(number) || number < 0) {
        return { values, error: `«${field.label}» debe ser un número igual o mayor que cero.` };
      }
    }
    if (field.kind === "select" && value && !field.options?.includes(value)) {
      return { values, error: `«${field.label}» tiene una opción no válida.` };
    }
    values[field.key] = value;
  }
  return { values, error: "" };
}

const MAX_SIGNED_BYTES = 10 * 1024 * 1024;

function percent(value: string) {
  if (!value.trim()) return null;
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
  const legalName = formText(formData, "legal_name") || null;
  const taxId = formText(formData, "tax_id") || null;
  const legalRepresentative = formText(formData, "legal_representative") || null;
  const legalAddress = formText(formData, "legal_address") || null;
  const contactEmail = formText(formData, "contact_email") || null;
  const startsOn = formText(formData, "starts_on") || null;
  const endsOn = formText(formData, "ends_on") || null;

  if (!businessId || !title || !templateBody) return { error: "Completa el título y la plantilla." };
  if (base === null || limit === null || cap === null) {
    return { error: "Los porcentajes deben estar entre 0 y menos de 100." };
  }
  if (cap < base) return { error: "El tope de comisión no puede ser menor que la comisión base." };
  if (!formText(formData, "target_profit_usd") || !Number.isFinite(targetUsd) || targetUsd < 0) {
    return { error: "La ganancia objetivo no puede ser negativa." };
  }
  if (status !== "draft" && status !== "issued") return { error: "Estado de contrato no válido." };
  if (startsOn && endsOn && startsOn > endsOn) {
    return { error: "La fecha de inicio no puede ser posterior a la de fin." };
  }

  const fields = readContractFields(formData);
  if (fields.error) return { error: fields.error };
  // Para emitir, todo dato que la plantilla usa debe tener valor. Un borrador puede quedar a medias.
  const filled: ContractValues = {
    ...fields.values,
    fecha: "fecha",
    negocio: "negocio",
    razon_social: legalName ?? "",
    ruc: taxId ?? "",
    direccion: legalAddress ?? "",
    representante: legalRepresentative ?? "",
    correo_negocio: contactEmail ?? "",
    vigencia_inicio: startsOn ?? "",
    vigencia_fin: endsOn ?? "",
    comision_base: String(base),
    limite_descuento: String(limit),
    ganancia_objetivo: String(targetUsd),
    tope_comision: String(cap),
  };
  const missing = status === "issued" ? missingContractKeys(templateBody, filled) : [];
  if (missing.length) {
    const labels = missing.map((key) =>
      CONTRACT_FIELDS.find((field) => field.key === key)?.label ?? key);
    return { error: `Faltan datos en el contrato: ${labels.join(", ")}.` };
  }

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin
    .from("business_contracts")
    .select("status")
    .eq("business_id", businessId)
    .maybeSingle();
  if (existing && existing.status !== "draft") {
    return { error: "Este contrato ya se emitió. Crea una nueva versión para cambiarlo." };
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
      legal_name: legalName,
      tax_id: taxId,
      legal_representative: legalRepresentative,
      legal_address: legalAddress,
      contact_email: contactEmail,
      starts_on: startsOn,
      ends_on: endsOn,
      contract_fields: fields.values,
      issued_at: status === "issued" ? new Date().toISOString() : null,
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
  if (!contract || contract.status !== "issued") {
    return { error: "Este contrato no está esperando tu firma." };
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
      status: "submitted",
      signed_pdf_path: path,
      signed_at: new Date().toISOString(),
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contract.id);
  if (error) return { error: error.message };

  revalidatePath("/panel/mi-contrato");
  revalidatePath("/panel/contratos");
  return { error: "", saved: true };
}

// Cambia el estado del contrato desde la ficha del equipo.
async function updateContractStatus(
  businessId: string,
  from: string[],
  values: Record<string, unknown>,
) {
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) throw new Error("Tu cuenta no puede administrar contratos.");
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from("business_contracts")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("business_id", businessId)
    .in("status", from);
  if (error) throw new Error(error.message);
  revalidatePath("/panel/contratos");
  revalidatePath(`/panel/contratos/${businessId}`);
  revalidatePath("/panel/mi-contrato");
}

// El equipo aprueba la copia firmada: el contrato queda vigente.
export async function verifySignedContractAction(formData: FormData) {
  const businessId = formText(formData, "business_id");
  await updateContractStatus(businessId, ["submitted"], {
    status: "signed",
    verified_at: new Date().toISOString(),
    rejection_reason: null,
  });
}

// El equipo rechaza la copia firmada con un motivo; el negocio debe subir otra.
export async function rejectSignedContractAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const businessId = formText(formData, "business_id");
  const reason = formText(formData, "rejection_reason");
  if (!reason) return { error: "Escribe el motivo para que el negocio pueda corregirlo." };
  await updateContractStatus(businessId, ["submitted"], {
    status: "issued",
    signed_pdf_path: null,
    signed_at: null,
    rejection_reason: reason,
  });
  return { error: "", saved: true };
}

// Abre una nueva versión editable a partir del contrato actual.
export async function newContractVersionAction(formData: FormData) {
  const businessId = formText(formData, "business_id");
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) throw new Error("Tu cuenta no puede administrar contratos.");
  const admin = getSupabaseAdminClient();
  const { data: contract } = await admin
    .from("business_contracts")
    .select("version")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!contract) return;
  await updateContractStatus(businessId, ["issued", "submitted", "signed", "void"], {
    status: "draft",
    version: Number(contract.version ?? 1) + 1,
    signed_pdf_path: null,
    signed_at: null,
    verified_at: null,
    issued_at: null,
    rejection_reason: null,
  });
  redirect(`/panel/contratos/${businessId}`);
}

// Anula el contrato: deja de aplicarse a las promociones del negocio.
export async function voidContractAction(formData: FormData) {
  const businessId = formText(formData, "business_id");
  await updateContractStatus(businessId, ["draft", "issued", "submitted", "signed"], {
    status: "void",
  });
}
