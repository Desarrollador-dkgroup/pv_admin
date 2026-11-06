"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageProviders } from "@/lib/panel-permissions";
import { formText, formChecked } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string };

// Actualiza las pantallas que muestran negocios y sus miembros.
function refreshBusinessViews(businessId: string) {
  revalidatePath("/panel/negocios");
  revalidatePath(`/panel/negocios/${businessId}`);
  revalidatePath("/panel/propietarios");
  revalidatePath("/panel");
}

// Asigna una cuenta existente a un negocio como propietario o colaborador.
// Las cuentas internas nunca se asignan como propietarios de negocio.
export async function addBusinessMemberAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageProviders(role)) {
    return { error: "Tu cuenta no puede asignar personas a negocios." };
  }

  const businessId = formText(formData, "business_id");
  const userId = formText(formData, "user_id");
  const memberRole = formText(formData, "member_role");
  if (!userId) return { error: "Selecciona una cuenta para asignar." };
  if (memberRole !== "owner" && memberRole !== "staff") {
    return { error: "El rol del negocio no es válido." };
  }

  // Consulta a la base si la cuenta pertenece al equipo interno.
  const { data: isPlatform, error: platformError } = await supabase.rpc(
    "padmin_is_platform_account",
    { p_user_id: userId },
  );
  if (platformError) return { error: "No se pudo verificar la cuenta seleccionada." };
  if (isPlatform) return { error: "Las cuentas del equipo no pueden ser propietarios de negocio." };

  const { error } = await supabase
    .from("business_members")
    .insert({ business_id: businessId, user_id: userId, role: memberRole });
  if (error) {
    const duplicated = error.message.includes("duplicate");
    return {
      error: duplicated ? "Esa cuenta ya pertenece a este negocio." : error.message,
    };
  }

  refreshBusinessViews(businessId);
  return { error: "" };
}

// Quita a una persona de un negocio. Su cuenta y sus datos personales permanecen intactos.
export async function removeBusinessMemberAction(formData: FormData): Promise<void> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageProviders(role)) throw new Error("Tu cuenta no puede quitar miembros.");

  const businessId = formText(formData, "business_id");
  const userId = formText(formData, "user_id");
  const { error } = await supabase
    .from("business_members")
    .delete()
    .eq("business_id", businessId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  refreshBusinessViews(businessId);
}

// Activa o desactiva un negocio. Solo el propietario principal y los admins lo hacen.
export async function setBusinessActiveAction(formData: FormData): Promise<void> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageCatalog(role)) throw new Error("Tu cuenta no puede cambiar el estado del negocio.");

  const businessId = formText(formData, "business_id");
  const isActive = formChecked(formData, "is_active");
  const { error } = await supabase
    .from("businesses")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", businessId);
  if (error) throw new Error(error.message);

  refreshBusinessViews(businessId);
}

// Permite al propietario editar nombre y descripción de su negocio.
// La función de la base vuelve a comprobar que el negocio es suyo.
export async function updateOwnBusinessAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role !== "propietario") return { error: "Esta sección es para propietarios de negocio." };

  const businessId = formText(formData, "business_id");
  if (!businessIds.includes(businessId)) return { error: "No puedes editar este negocio." };

  const name = formText(formData, "name");
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  const { error } = await supabase.rpc("owner_update_business", {
    p_business_id: businessId,
    p_name: name,
  });
  if (error) return { error: error.message };

  revalidatePath(`/panel/negocios/${businessId}`);
  revalidatePath("/panel/negocios");
  revalidatePath("/panel");
  return { error: "" };
}

// Agrega un nuevo servicio al plan del negocio.
export async function addServicePlanAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageProviders(role)) {
    return { error: "Tu cuenta no puede agregar servicios al plan." };
  }

  const businessId = formText(formData, "business_id");
  const categoryId = formText(formData, "category_id");
  const hospedajeTypeId = formText(formData, "hospedaje_type_id");
  const quantity = formText(formData, "quantity");

  if (!categoryId) return { error: "Selecciona una categoría." };
  if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 1) {
    return { error: "La cantidad debe ser un número mayor a 0." };
  }

  const { error } = await supabase.from("business_service_plans").insert({
    business_id: businessId,
    category_id: categoryId,
    hospedaje_type_id: categoryId === "hospedaje" ? hospedajeTypeId : null,
    quantity: Number(quantity),
  });

  if (error) {
    return { error: error.message.includes("duplicate")
      ? "Este tipo de servicio ya está en el plan."
      : error.message };
  }

  refreshBusinessViews(businessId);
  return { error: "" };
}

// Quita una línea del plan de servicios. Los servicios ya creados no se borran.
export async function removeServicePlanAction(formData: FormData): Promise<void> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageProviders(role)) throw new Error("Tu cuenta no puede cambiar el plan.");
  const businessId = formText(formData, "business_id");
  const planId = formText(formData, "plan_id");
  const { error } = await supabase
    .from("business_service_plans")
    .delete()
    .eq("id", planId)
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
  refreshBusinessViews(businessId);
}

// Crea un negocio nuevo (sin propietario). Después se asigna el propietario desde su ficha.
export async function createBusinessAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { role } = await getPanelIdentity();
  if (!canManageProviders(role)) {
    return { error: "Tu cuenta no puede crear negocios." };
  }
  const name = formText(formData, "name");
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("businesses")
    .insert({
      slug: `negocio-${crypto.randomUUID().slice(0, 8)}`,
      name,
      is_active: true,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "No se pudo crear el negocio. Intenta de nuevo." };

  revalidatePath("/panel/negocios");
  redirect(`/panel/negocios/${data.id}`);
}

// Amplía una línea del plan en 1: el propietario puede crear un servicio más de esa categoría.
export async function expandServicePlanAction(formData: FormData): Promise<void> {
  const { supabase, role } = await getPanelIdentity();
  if (!canManageProviders(role)) throw new Error("Tu cuenta no puede ampliar el plan.");
  const businessId = formText(formData, "business_id");
  const planId = formText(formData, "plan_id");
  const { data: plan, error: readError } = await supabase
    .from("business_service_plans")
    .select("quantity")
    .eq("id", planId)
    .eq("business_id", businessId)
    .single();
  if (readError || !plan) throw new Error("No se encontró esa línea del plan.");
  const { error } = await supabase
    .from("business_service_plans")
    .update({ quantity: plan.quantity + 1 })
    .eq("id", planId)
    .eq("business_id", businessId);
  if (error) throw new Error(error.message);
  refreshBusinessViews(businessId);
}
