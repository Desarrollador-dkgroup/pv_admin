"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageProviders } from "@/lib/panel-permissions";
import { formText, formChecked } from "@/lib/panel-form";
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

// Permite al propietario editar nombre, ciudad y descripción de su negocio.
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
  const description = formText(formData, "description");
  const cityId = formText(formData, "city_id");
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }
  if (description.length > 1200) {
    return { error: "La descripción no puede pasar de 1200 caracteres." };
  }
  if (!cityId) return { error: "Selecciona la ciudad del negocio." };

  const { error } = await supabase.rpc("owner_update_business", {
    p_business_id: businessId,
    p_name: name,
    p_description: description,
    p_city_id: cityId,
  });
  if (error) return { error: error.message };

  revalidatePath(`/panel/negocios/${businessId}`);
  revalidatePath("/panel/negocios");
  revalidatePath("/panel");
  return { error: "" };
}
