"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageProviders } from "@/lib/panel-permissions";
import { formText } from "@/lib/panel-form";

// Suspende o reactiva el acceso de un propietario de negocio. Nunca toca cuentas internas.
// La base de datos vuelve a verificar la regla con las políticas de blocked_users.
async function requireOwnerManagement() {
  const identity = await getPanelIdentity();
  if (!canManageProviders(identity.role)) {
    throw new Error("Tu cuenta no puede administrar propietarios.");
  }
  return identity;
}

// Revalida las pantallas que muestran el estado de cada propietario.
function refreshOwnerViews() {
  revalidatePath("/panel/propietarios");
  revalidatePath("/panel/negocios");
  revalidatePath("/panel");
  revalidatePath("/panel/notificaciones");
}

// Suspende a un propietario: pierde acceso al panel y a la edición de sus negocios.
export async function suspendOwnerAction(formData: FormData): Promise<void> {
  const { supabase, user } = await requireOwnerManagement();
  const userId = formText(formData, "user_id");
  if (!userId || userId === user.id) throw new Error("Esta cuenta no se puede suspender.");

  // Las cuentas internas no se suspenden desde el panel.
  const { data: isPlatform, error: platformError } = await supabase.rpc(
    "padmin_is_platform_account",
    { p_user_id: userId },
  );
  if (platformError) throw new Error("No se pudo verificar la cuenta.");
  if (isPlatform) throw new Error("Las cuentas del equipo no se suspenden desde aquí.");

  const { error } = await supabase
    .from("blocked_users")
    .insert({ user_id: userId, blocked_by: user.id, reason: "Suspendida desde el panel" });
  if (error && !error.message.includes("duplicate")) throw new Error(error.message);

  refreshOwnerViews();
}

// Reactiva a un propietario suspendido para que vuelva a entrar al panel.
export async function reactivateOwnerAction(formData: FormData): Promise<void> {
  const { supabase } = await requireOwnerManagement();
  const userId = formText(formData, "user_id");
  const { error } = await supabase.from("blocked_users").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);

  refreshOwnerViews();
}
