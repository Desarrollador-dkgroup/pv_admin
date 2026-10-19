"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import {
  assignableTeamRoles,
  canEditName,
  canManageAccount,
} from "@/lib/panel-permissions";
import { generateTemporaryPassword } from "@/lib/panel-password";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { PanelRole } from "@/types/panel";

type FormState = { error: string };
type TeamRole = "admin" | "collaborator";
type AccountInput = { email: string; name: string; role: string };

// Roles de equipo que existen en platform_admins. El propietario principal nunca se edita.
const TEAM_ROLES = ["admin", "collaborator"] as const;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

// Busca si el correo ya tiene cuenta en Auth o en el perfil. Devuelve un mensaje si está
// ocupado o si no se pudo verificar; null si está libre.
async function emailProblem(email: string): Promise<string | null> {
  try {
    const admin = getSupabaseAdminClient();
    const profile = await admin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (profile.error) return "No se pudo verificar el correo. Intenta de nuevo.";
    if (profile.data) return "Ya existe una cuenta con ese correo.";

    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (users.error) return "No se pudo verificar el correo. Intenta de nuevo.";
    const taken = users.data.users.some((user) => user.email?.toLowerCase() === email);
    return taken ? "Ya existe una cuenta con ese correo." : null;
  } catch {
    return "Falta configurar la clave de administración del servidor (SUPABASE_SERVICE_ROLE_KEY).";
  }
}

// Genera una contraseña temporal. No guarda nada: solo la devuelve para entregarla.
export async function generateTemporaryPasswordAction(
  input: AccountInput,
): Promise<{ error: string; password?: string }> {
  const { role } = await getPanelIdentity();
  const problem = validateAccount(input);
  if (problem) return { error: problem };
  if (!assignableTeamRoles(role).includes(input.role as TeamRole)) {
    return { error: "Tu rol no puede crear esa clase de cuenta." };
  }
  // Antes de generar la contraseña se confirma que el correo esté libre.
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

  // Revalida el correo en el servidor, por si alguien lo creó después de generar la clave.
  const taken = await emailProblem(email);
  if (taken) return { error: taken };
  const admin = getSupabaseAdminClient();

  // Crea el usuario en Auth con el correo ya confirmado y la contraseña temporal.
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  if (created.error || !created.data.user) {
    const exists = created.error?.message.toLowerCase().includes("already") ?? false;
    return {
      error: exists
        ? "Ya existe una cuenta con ese correo."
        : "No se pudo crear la cuenta. Intenta de nuevo.",
    };
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
  revalidatePath("/panel/propietarios");
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

  // Lee el rol de la cuenta en la base; las cuentas sin rol interno son propietarios.
  const { data: team, error: readError } = await supabase
    .from("platform_admins")
    .select("platform_role")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) return { error: "No se pudo verificar la cuenta." };
  const targetRole = (team?.platform_role as PanelRole | undefined) ?? "propietario";
  if (!canEditName(role, targetRole)) {
    return { error: "Tu rol no puede cambiar el nombre de esta cuenta." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) return { error: error.message };

  revalidatePath("/panel/permisos");
  revalidatePath("/panel/propietarios");
  revalidatePath("/panel/negocios");
  return { error: "" };
}

// Cambia el rol de una cuenta del equipo, siempre que la matriz lo permita en ambos sentidos.
export async function updateTeamRoleAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, role } = await getPanelIdentity();
  const userId = formText(formData, "user_id");
  const nextRole = formText(formData, "platform_role");
  if (!isTeamRole(nextRole)) return { error: "El rol seleccionado no es válido." };

  // Lee el rol actual en la base; no confía en el valor que llega del formulario.
  const { data: current, error: readError } = await supabase
    .from("platform_admins")
    .select("platform_role")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError || !current) return { error: "No se encontró la cuenta en el equipo." };

  const currentRole = current.platform_role as PanelRole;
  if (!canManageAccount(role, currentRole) || !assignableTeamRoles(role).includes(nextRole)) {
    return { error: "Tu rol no puede cambiar esta cuenta." };
  }

  const { error } = await supabase
    .from("platform_admins")
    .update({ platform_role: nextRole })
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/panel/permisos");
  return { error: "" };
}

// Quita una cuenta del equipo. La cuenta de Auth y sus datos se conservan.
export async function removeTeamAccountAction(formData: FormData): Promise<void> {
  const { supabase, role } = await getPanelIdentity();
  const userId = formText(formData, "user_id");

  const { data: current, error: readError } = await supabase
    .from("platform_admins")
    .select("platform_role")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError || !current) throw new Error("No se encontró la cuenta en el equipo.");
  if (!canManageAccount(role, current.platform_role as PanelRole)) {
    throw new Error("Tu rol no puede quitar esta cuenta del equipo.");
  }

  const { error } = await supabase.from("platform_admins").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/panel/permisos");
  revalidatePath("/panel");
}
