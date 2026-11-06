"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageProviders } from "@/lib/panel-permissions";
import { formText, formChecked } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

type FormState = { error: string; saved?: boolean };

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

// Agrega otro negocio a un propietario existente y amplía su plan con las cantidades elegidas.
// Las cantidades llegan como `cat__<categoría>` (sin hospedaje) y `type__<tipo de hospedaje>`.
export async function addOwnerBusinessAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { role } = await getPanelIdentity();
  if (!canManageProviders(role)) return { error: "Tu cuenta no puede agregar negocios." };

  const ownerId = formText(formData, "owner_id");
  const name = formText(formData, "name");
  if (!ownerId) return { error: "Selecciona al propietario." };
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  const plan: { category_id: string; hospedaje_type_id: string | null; quantity: number }[] = [];
  for (const [key, raw] of formData.entries()) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 20) {
      return { error: "Las cantidades del plan deben ser números enteros entre 0 y 20." };
    }
    if (quantity === 0) continue;
    if (key.startsWith("cat__")) {
      plan.push({ category_id: key.slice(5), hospedaje_type_id: null, quantity });
    } else if (key.startsWith("type__")) {
      plan.push({ category_id: "hospedaje", hospedaje_type_id: key.slice(6), quantity });
    }
  }
  if (!plan.length) return { error: "Elige al menos un servicio para el plan del negocio." };

  const admin = getSupabaseAdminClient();
  const { data: owned } = await admin
    .from("business_members")
    .select("business_id")
    .eq("user_id", ownerId)
    .eq("role", "owner")
    .limit(1);
  if (!owned?.length) return { error: "Esa cuenta no es propietaria de ningún negocio." };

  const business = await admin
    .from("businesses")
    .insert({
      slug: `negocio-${crypto.randomUUID().slice(0, 8)}`,
      name,
      is_active: true,
    })
    .select("id")
    .single();
  if (business.error || !business.data) {
    return { error: "No se pudo crear el negocio. Intenta de nuevo." };
  }
  const businessId = business.data.id;

  const membership = await admin
    .from("business_members")
    .insert({ business_id: businessId, user_id: ownerId, role: "owner" });
  const planRows = await admin.from("business_service_plans").insert(
    plan.map((row) => ({ business_id: businessId, ...row })),
  );
  if (membership.error || planRows.error) {
    await admin.from("business_members").delete().eq("business_id", businessId);
    await admin.from("business_service_plans").delete().eq("business_id", businessId);
    await admin.from("businesses").delete().eq("id", businessId);
    return { error: "No se pudo agregar el negocio al propietario. Intenta de nuevo." };
  }

  refreshBusinessViews(businessId);
  return { error: "", saved: true };
}
