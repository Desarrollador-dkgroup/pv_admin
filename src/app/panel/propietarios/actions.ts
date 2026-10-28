"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageProviders } from "@/lib/panel-permissions";
import { formText } from "@/lib/panel-form";
import { generateTemporaryPassword } from "@/lib/panel-password";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

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

type AdminClient = ReturnType<typeof getSupabaseAdminClient>;
type OwnerServiceInput = {
  categoryId: string;
  hospedajeTypeId: string | null;
  count: number;
};
type OwnerAccountInput = {
  name: string;
  email: string;
  password: string;
  services: OwnerServiceInput[];
};

const OWNER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOSPEDAJE = "hospedaje";
const MAX_UNITS_PER_LINE = 50;
const MAX_UNITS_TOTAL = 100;
const KEY_ERROR =
  "Falta configurar la clave de administración del servidor (SUPABASE_SERVICE_ROLE_KEY).";

// Revisa el nombre y el correo de la persona. Devuelve el mensaje de error o null.
function validateIdentity(name: string, email: string): string | null {
  if (!OWNER_EMAIL_PATTERN.test(email)) return "Escribe un correo válido.";
  if (name.length < 2 || name.length > 80) {
    return "El nombre debe tener entre 2 y 80 caracteres.";
  }
  return null;
}

// Indica si el correo ya tiene cuenta. Devuelve el mensaje de error o null si está libre.
async function emailProblem(admin: AdminClient, email: string): Promise<string | null> {
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) return "No se pudo verificar el correo. Intenta de nuevo.";
  return users.data.users.some((item) => item.email?.toLowerCase() === email)
    ? "Ya existe una cuenta con ese correo."
    : null;
}

// Genera la contraseña temporal después de confirmar que el correo está libre.
export async function generateOwnerPasswordAction(input: {
  name: string;
  email: string;
}): Promise<{ error: string; password?: string }> {
  const { role } = await getPanelIdentity();
  if (!canManageProviders(role)) return { error: "Tu cuenta no puede agregar propietarios." };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const problem = validateIdentity(name, email);
  if (problem) return { error: problem };

  let admin: AdminClient;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return { error: KEY_ERROR };
  }
  const taken = await emailProblem(admin, email);
  if (taken) return { error: taken };
  return { error: "", password: generateTemporaryPassword() };
}

// Deshace la creación: plan, asignación, negocio y cuenta, en ese orden.
async function rollbackOwner(admin: AdminClient, businessId: string, userId: string | null) {
  await admin.from("business_service_plans").delete().eq("business_id", businessId);
  if (userId) {
    await admin.from("business_members").delete().eq("user_id", userId);
    await admin.auth.admin.deleteUser(userId);
  }
  await admin.from("businesses").delete().eq("id", businessId);
}

// Crea la cuenta del propietario, un negocio base para él y el plan de servicios que
// el propietario completará desde su cuenta. Si un paso falla, se deshace todo.
export async function createOwnerAccountAction(
  input: OwnerAccountInput,
): Promise<{ error: string; email?: string }> {
  const { role } = await getPanelIdentity();
  if (!canManageProviders(role)) return { error: "Tu cuenta no puede agregar propietarios." };

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const problem = validateIdentity(name, email);
  if (problem) return { error: problem };
  if (input.password.length < 10) {
    return { error: "La contraseña temporal no es válida. Vuelve a generarla." };
  }
  if (!input.services.length) return { error: "Agrega al menos un servicio." };

  let admin: AdminClient;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return { error: KEY_ERROR };
  }

  const [categories, types] = await Promise.all([
    admin.from("categories").select("id, label"),
    admin.from("hospedaje_types").select("id, label"),
  ]);
  if (categories.error || types.error) {
    return { error: "No se pudieron leer los catálogos. Intenta de nuevo." };
  }
  const categoryIds = new Set((categories.data ?? []).map((item) => item.id));
  const typeIds = new Set((types.data ?? []).map((item) => item.id));

  let total = 0;
  for (const service of input.services) {
    if (!categoryIds.has(service.categoryId)) {
      return { error: "Una categoría ya no existe en el catálogo." };
    }
    if (service.categoryId === HOSPEDAJE && !typeIds.has(service.hospedajeTypeId ?? "")) {
      return { error: "Selecciona el tipo de cada hospedaje." };
    }
    if (!Number.isInteger(service.count) || service.count < 1
      || service.count > MAX_UNITS_PER_LINE) {
      return { error: `Cada cantidad debe estar entre 1 y ${MAX_UNITS_PER_LINE}.` };
    }
    total += service.count;
  }
  if (total > MAX_UNITS_TOTAL) {
    return { error: `Son demasiados servicios. El máximo es ${MAX_UNITS_TOTAL}.` };
  }

  const taken = await emailProblem(admin, email);
  if (taken) return { error: taken };

  // Negocio base: el propietario define su nombre y descripción desde su cuenta.
  const business = await admin
    .from("businesses")
    .insert({
      slug: `negocio-${crypto.randomUUID().slice(0, 8)}`,
      name: `Negocio de ${name}`,
      is_active: true,
    })
    .select("id")
    .single();
  if (business.error || !business.data) {
    return { error: "No se pudo crear el negocio base. Intenta de nuevo." };
  }
  const businessId = business.data.id;

  // La contraseña temporal obliga a cambiarla en el primer inicio de sesión.
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: name, must_change_password: true },
  });
  if (created.error || !created.data.user) {
    await rollbackOwner(admin, businessId, null);
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }
  const userId = created.data.user.id;

  const profile = await admin
    .from("profiles")
    .upsert({ id: userId, display_name: name, email }, { onConflict: "id" });
  if (profile.error) {
    await rollbackOwner(admin, businessId, userId);
    return { error: "No se pudo guardar el perfil. La cuenta no se creó." };
  }

  const membership = await admin
    .from("business_members")
    .insert({ business_id: businessId, user_id: userId, role: "owner" });
  if (membership.error) {
    await rollbackOwner(admin, businessId, userId);
    return { error: "No se pudo asignar el negocio. La cuenta no se creó." };
  }

  const plan = await admin.from("business_service_plans").insert(
    input.services.map((service) => ({
      business_id: businessId,
      category_id: service.categoryId,
      hospedaje_type_id: service.categoryId === HOSPEDAJE ? service.hospedajeTypeId : null,
      quantity: service.count,
    })),
  );
  if (plan.error) {
    await rollbackOwner(admin, businessId, userId);
    return { error: "No se pudo guardar el plan de servicios. La cuenta no se creó." };
  }

  revalidatePath("/panel/propietarios");
  revalidatePath("/panel/negocios");
  revalidatePath(`/panel/negocios/${businessId}`);
  revalidatePath("/panel");
  return { error: "", email };
}

// Borra la cuenta de un propietario y sus vínculos con negocios. Nunca borra cuentas del
// equipo ni la cuenta de quien ejecuta la acción. Los negocios que queden sin propietario
// siguen existiendo y se ven como "Sin propietario".
export async function deleteOwnerAccountAction(
  _previous: { error: string },
  formData: FormData,
): Promise<{ error: string }> {
  const { user, role } = await getPanelIdentity();
  if (!canManageProviders(role)) return { error: "Tu cuenta no puede borrar propietarios." };

  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "Falta la cuenta a borrar." };
  if (userId === user.id) return { error: "No puedes borrar tu propia cuenta." };

  // Borrar una cuenta de Auth exige la clave de servicio configurada en Cloudflare.
  let admin: AdminClient;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return {
      error: "Falta el secreto SUPABASE_SERVICE_ROLE_KEY en Cloudflare para borrar cuentas.",
    };
  }
  const { data: teamAccount, error: teamError } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (teamError) return { error: "No se pudo verificar la cuenta." };
  if (teamAccount) return { error: "Las cuentas del equipo no se borran desde aquí." };

  const links = await Promise.all([
    admin.from("business_members").delete().eq("user_id", userId),
    admin.from("blocked_users").delete().eq("user_id", userId),
    admin.from("profiles").delete().eq("id", userId),
  ]);
  if (links.some((result) => result.error)) {
    return { error: "No se pudieron quitar los vínculos de la cuenta." };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: "No se pudo borrar la cuenta." };

  refreshOwnerViews();
  return { error: "" };
}
