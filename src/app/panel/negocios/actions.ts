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
  revalidatePath("/panel/servicios");
  revalidatePath("/panel/servicios/nuevo");
  revalidatePath("/panel");
}

// Da al negocio `count` cupos libres más en una categoría (y tipo, en hospedaje).
// El plan es un tope total: el propietario crea servicios mientras los creados sean menos que
// el cupo. Por eso el cupo nuevo parte del mayor entre el cupo actual y los ya creados, y así
// cada ampliación deja de verdad `count` servicios disponibles para crear. Si había líneas
// repetidas de la misma combinación, se unen en una sola.
async function grantPlanSlots(
  businessId: string,
  categoryId: string,
  typeId: string | null,
  count: number,
): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  const linesQuery = admin
    .from("business_service_plans")
    .select("id, quantity")
    .eq("business_id", businessId)
    .eq("category_id", categoryId)
    .order("created_at");
  const usedQuery = admin
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("category_id", categoryId);
  const [lines, used] = await Promise.all([
    typeId ? linesQuery.eq("hospedaje_type_id", typeId) : linesQuery.is("hospedaje_type_id", null),
    typeId ? usedQuery.eq("hospedaje_type_id", typeId) : usedQuery.is("hospedaje_type_id", null),
  ]);
  if (lines.error) return lines.error.message;
  if (used.error) return used.error.message;

  const rows = lines.data ?? [];
  const currentQuota = rows.reduce((sum, row) => sum + row.quantity, 0);
  const quota = Math.max(currentQuota, used.count ?? 0) + count;

  if (!rows.length) {
    const { error } = await admin.from("business_service_plans").insert({
      business_id: businessId,
      category_id: categoryId,
      hospedaje_type_id: typeId,
      quantity: quota,
    });
    return error?.message ?? null;
  }
  const [first, ...rest] = rows;
  const { error } = await admin
    .from("business_service_plans")
    .update({ quantity: quota })
    .eq("id", first.id);
  if (error) return error.message;
  if (rest.length) {
    const { error: mergeError } = await admin
      .from("business_service_plans")
      .delete()
      .in("id", rest.map((row) => row.id));
    if (mergeError) return mergeError.message;
  }
  return null;
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
  const { role } = await getPanelIdentity();
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

  const typeId = categoryId === "hospedaje" ? hospedajeTypeId || null : null;
  if (categoryId === "hospedaje" && !typeId) return { error: "Elige el tipo de hospedaje." };
  const error = await grantPlanSlots(businessId, categoryId, typeId, Number(quantity));
  if (error) return { error };

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

// Da 1 servicio disponible más en una categoría (y tipo de hospedaje, si lo tiene).
export async function addPlanServiceAction(formData: FormData): Promise<void> {
  const { role } = await getPanelIdentity();
  if (!canManageProviders(role)) throw new Error("Tu cuenta no puede ampliar el plan.");
  const businessId = formText(formData, "business_id");
  const categoryId = formText(formData, "category_id");
  const typeId = formText(formData, "hospedaje_type_id") || null;
  if (!categoryId) throw new Error("Falta la categoría.");
  if (categoryId === "hospedaje" && !typeId) throw new Error("Elige el tipo de hospedaje.");
  const error = await grantPlanSlots(businessId, categoryId, typeId, 1);
  if (error) throw new Error(error);
  refreshBusinessViews(businessId);
}

// Quita todas las líneas del plan de una categoría. Los servicios ya creados no se borran.
export async function removeServicePlanCategoryAction(formData: FormData): Promise<void> {
  const { role } = await getPanelIdentity();
  const admin = getSupabaseAdminClient();
  if (!canManageProviders(role)) throw new Error("Tu cuenta no puede cambiar el plan.");
  const businessId = formText(formData, "business_id");
  const categoryId = formText(formData, "category_id");
  const { error } = await admin
    .from("business_service_plans")
    .delete()
    .eq("business_id", businessId)
    .eq("category_id", categoryId);
  if (error) throw new Error(error.message);
  refreshBusinessViews(businessId);
}
