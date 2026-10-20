"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import {
  assignableTeamRoles,
  canEditName,
  canManageAccount,
} from "@/lib/panel-permissions";
import { generateTemporaryPassword } from "@/lib/panel-password";
import { loadTeamTarget } from "@/lib/panel-team";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

type FormState = { error: string };
type PasswordState = { error: string; password?: string };
type TeamRole = "admin" | "collaborator";
type AccountInput = { email: string; name: string; role: string };

// Roles de equipo que existen en platform_admins. El propietario principal nunca se edita.
const TEAM_ROLES = ["admin", "collaborator"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_ERROR =
  "Falta configurar la clave de administración del servidor (SUPABASE_SERVICE_ROLE_KEY).";

// Verifica que el valor recibido sea un rol de equipo válido.
function isTeamRole(value: string): value is TeamRole {
  return (TEAM_ROLES as readonly string[]).includes(value);
}

// Revisa los datos básicos de una cuenta nueva. Devuelve el mensaje de error o null.
function validateAccount(input: AccountInput): string | null {
  if (!EMAIL_PATTERN.test(input.email.trim())) return "Escribe un correo válido.";
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) {
    return "El nombre debe tener entre 2 y 80 caracteres.";
  }
  if (!isTeamRole(input.role)) return "El rol seleccionado no es válido.";
  return null;
}

// Revisa si el correo ya tiene cuenta. Devuelve un mensaje si no se puede usar; null si está libre.
async function emailProblem(email: string): Promise<string | null> {
  try {
    const admin = getSupabaseAdminClient();
    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (users.error) return "No se pudo verificar el correo. Intenta de nuevo.";
    const existing = users.data.users.find((item) => item.email?.toLowerCase() === email);
    if (!existing) return null;

    const inTeam = await admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", existing.id)
      .maybeSingle();
    const inBusiness = await admin
      .from("business_members")
      .select("user_id")
      .eq("user_id", existing.id)
      .limit(1);
    const hasRole = Boolean(inTeam.data) || Boolean(inBusiness.data?.length);
    return hasRole
      ? "Ya existe una cuenta con ese correo."
      : "Esa cuenta ya existe sin rol de equipo. Si aparece en la lista, pulsa Editar " +
        "para asignarle rol.";
  } catch {
    return KEY_ERROR;
  }
}

// Genera una contraseña temporal. Antes confirma que el correo esté libre.
export async function generateTemporaryPasswordAction(
  input: AccountInput,
): Promise<{ error: string; password?: string }> {
  const { role } = await getPanelIdentity();
  const problem = validateAccount(input);
  if (problem) return { error: problem };
  if (!assignableTeamRoles(role).includes(input.role as TeamRole)) {
    return { error: "Tu rol no puede crear esa clase de cuenta." };
  }
  const taken = await emailProblem(input.email.trim().toLowerCase());
  if (taken) return { error: taken };
  return { error: "", password: generateTemporaryPassword() };
}

// Crea la cuenta en Supabase Auth, guarda su perfil y le asigna el rol de equipo.
// Si un paso falla, elimina la cuenta recién creada para no dejar datos a medias.
export async function createTeamAccountAction(
  input: AccountInput & { password: string },
): Promise<{ error: string }> {
  const identity = await getPanelIdentity();
  const problem = validateAccount(input);
  if (problem) return { error: problem };
  if (!assignableTeamRoles(identity.role).includes(input.role as TeamRole)) {
    return { error: "Tu rol no puede crear esa clase de cuenta." };
  }
  if (input.password.length < 10) {
    return { error: "La contraseña temporal no es válida. Vuelve a generarla." };
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  // Revalida el correo en el servidor, por si alguien lo registró después de generar la clave.
  const taken = await emailProblem(email);
  if (taken) return { error: taken };
  const admin = getSupabaseAdminClient();

  // Crea el usuario con el correo confirmado y la contraseña temporal. La marca
  // "team_account" permite listarla después aunque pierda el rol.
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      display_name: name,
      must_change_password: true,
      team_account: true,
    },
  });
  if (created.error || !created.data.user) {
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }
  const userId = created.data.user.id;

  // El perfil guarda nombre y correo para mostrarlos y buscarlos en el panel.
  const profile = await admin
    .from("profiles")
    .upsert({ id: userId, display_name: name, email }, { onConflict: "id" });
  if (profile.error) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "No se pudo guardar el perfil. La cuenta no se creó." };
  }

  // El rol se inserta con la sesión de quien crea la cuenta, así RLS vuelve a verificarlo.
  const membership = await identity.supabase.from("platform_admins").insert({
    user_id: userId,
    platform_role: input.role,
    granted_by: identity.user.id,
  });
  if (membership.error) {
    await admin.auth.admin.deleteUser(userId);
    return { error: "No se pudo asignar el rol. La cuenta no se creó." };
  }

  revalidatePath("/panel/permisos");
  revalidatePath("/panel");
  return { error: "" };
}

// Cambia el nombre visible de una cuenta según la matriz de permisos por rol.
export async function updatePersonNameAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  const userId = formText(formData, "user_id");
  const name = formText(formData, "display_name");
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres." };
  }

  const target = await loadTeamTarget(supabase, userId);
  if (target.error) return { error: target.error };
  if (!canEditName(role, target.effectiveRole)) {
    return { error: "Tu rol no puede cambiar el nombre de esta cuenta." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/panel/permisos");
  revalidatePath(`/panel/permisos/${userId}`);
  revalidatePath("/panel/propietarios");
  revalidatePath("/panel/negocios");
  return { error: "" };
}

// Asigna o cambia el rol de equipo. Una cuenta sin rol recibe uno nuevo, siempre que no sea
// propietario de negocio. La matriz se valida en ambos sentidos.
export async function updateTeamRoleAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role, user } = await getPanelIdentity();
  const userId = formText(formData, "user_id");
  const nextRole = formText(formData, "platform_role");
  if (!isTeamRole(nextRole)) return { error: "El rol seleccionado no es válido." };
  if (!assignableTeamRoles(role).includes(nextRole)) {
    return { error: "Tu rol no puede asignar ese rol." };
  }

  const target = await loadTeamTarget(supabase, userId);
  if (target.error) return { error: target.error };
  if (!canManageAccount(role, target.effectiveRole)) {
    return { error: "Tu rol no puede cambiar esta cuenta." };
  }

  const result = target.teamRole
    ? await supabase
      .from("platform_admins")
      .update({ platform_role: nextRole })
      .eq("user_id", userId)
    : await supabase.from("platform_admins").insert({
      user_id: userId,
      platform_role: nextRole,
      granted_by: user.id,
    });
  if (result.error) return { error: result.error.message };

  revalidatePath("/panel/permisos");
  revalidatePath(`/panel/permisos/${userId}`);
  revalidatePath("/panel");
  return { error: "" };
}

// Genera una contraseña temporal nueva para una cuenta del equipo. La persona deberá
// cambiarla al entrar. La nueva clave se devuelve una sola vez para entregarla.
export async function resetTemporaryPasswordAction(
  _previous: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const { supabase, role, user } = await getPanelIdentity();
  const userId = formText(formData, "user_id");
  if (userId === user.id) {
    return { error: "Para cambiar tu contraseña usa la opción de tu sesión." };
  }

  const target = await loadTeamTarget(supabase, userId);
  if (target.error) return { error: target.error };
  if (!canManageAccount(role, target.effectiveRole)) {
    return { error: "Tu rol no puede cambiar la contraseña de esta cuenta." };
  }

  try {
    const admin = getSupabaseAdminClient();
    const current = await admin.auth.admin.getUserById(userId);
    if (current.error || !current.data.user) {
      return { error: "No se encontró la cuenta en Auth." };
    }
    const password = generateTemporaryPassword();
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { ...current.data.user.user_metadata, must_change_password: true },
    });
    if (error) return { error: "No se pudo restablecer la contraseña. Intenta de nuevo." };
    return { error: "", password };
  } catch {
    return { error: KEY_ERROR };
  }
}

// Elimina la cuenta por completo: acceso, perfil y rol. Si tiene reservas u otros datos
// ligados, la base lo impide y se informa al usuario.
export async function deleteTeamAccountAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role, user } = await getPanelIdentity();
  const userId = formText(formData, "user_id");
  if (userId === user.id) return { error: "No puedes eliminar tu propia cuenta." };

  const target = await loadTeamTarget(supabase, userId);
  if (target.error) return { error: target.error };
  if (!canManageAccount(role, target.effectiveRole)) {
    return { error: "Tu rol no puede eliminar esta cuenta." };
  }

  try {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return {
        error: "No se pudo eliminar la cuenta. Puede tener reservas u otros datos ligados.",
      };
    }
  } catch {
    return { error: KEY_ERROR };
  }

  revalidatePath("/panel/permisos");
  revalidatePath("/panel");
  redirect("/panel/permisos");
}
