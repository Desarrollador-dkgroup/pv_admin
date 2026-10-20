"use server";

import { revalidatePath } from "next/cache";
import { getPanelIdentity } from "@/lib/panel-access";
import { formText } from "@/lib/panel-form";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Crea un perfil nuevo que entra al mismo negocio que el propietario, con los mismos permisos.
export async function addCoOwnerAction(
  _previous: { error: string; done: boolean },
  formData: FormData,
): Promise<{ error: string; done: boolean }> {
  const { role, businessIds, user } = await getPanelIdentity();
  if (role !== "propietario") {
    return { error: "Solo el propietario del negocio puede agregar personas.", done: false };
  }
  const businessId = businessIds[0];
  if (!businessId) return { error: "Tu cuenta no tiene un negocio asignado.", done: false };

  const name = formText(formData, "name");
  const email = formText(formData, "email").toLowerCase();
  const password = formText(formData, "password");
  if (name.length < 2 || name.length > 80) {
    return { error: "El nombre debe tener entre 2 y 80 caracteres.", done: false };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Escribe un correo válido.", done: false };
  }
  if (password.length < 10) {
    return { error: "La contraseña temporal debe tener al menos 10 caracteres.", done: false };
  }

  // Solo el propietario principal puede crear cuentas nuevas para el negocio.
  const admin = getSupabaseAdminClient();
  const viewer = await admin
    .from("business_members")
    .select("added_by")
    .eq("business_id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (viewer.error || !viewer.data || viewer.data.added_by !== null) {
    return { error: "Solo el propietario principal puede agregar cuentas.", done: false };
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, must_change_password: true },
  });
  if (created.error || !created.data.user) {
    return {
      error: "No se pudo crear la cuenta. Revisa que el correo no esté ya registrado.",
      done: false,
    };
  }
  const userId = created.data.user.id;

  const profile = await admin
    .from("profiles")
    .upsert({ id: userId, display_name: name, email }, { onConflict: "id" });
  const membership = profile.error
    ? null
    : await admin
      .from("business_members")
      .insert({ business_id: businessId, user_id: userId, role: "owner", added_by: user.id });

  if (profile.error || membership?.error) {
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return {
      error: "No se pudo asignar la persona al negocio. La cuenta no se creó.",
      done: false,
    };
  }

  revalidatePath("/panel/cuenta");
  return { error: "", done: true };
}

// Quita un perfil adicional y borra su cuenta. Solo lo puede hacer el propietario principal.
// El perfil principal nunca se quita desde aquí, ni siquiera por sí mismo.
export async function removeCoOwnerAction(formData: FormData): Promise<void> {
  const { role, businessIds, user } = await getPanelIdentity();
  const businessId = businessIds[0];
  if (role !== "propietario" || !businessId) {
    throw new Error("Solo el propietario principal puede quitar perfiles.");
  }
  const targetId = formText(formData, "user_id");
  if (!targetId) throw new Error("Falta el perfil a quitar.");
  if (targetId === user.id) throw new Error("No puedes quitar tu propio perfil.");

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("business_members")
    .select("user_id, added_by")
    .eq("business_id", businessId)
    .eq("role", "owner");
  if (error) throw new Error("No se pudieron leer las personas con acceso.");

  const members = data ?? [];
  const me = members.find((member) => member.user_id === user.id);
  const target = members.find((member) => member.user_id === targetId);
  if (!me || me.added_by !== null) {
    throw new Error("Solo el propietario principal puede quitar perfiles.");
  }
  if (!target) throw new Error("Esa persona no tiene acceso a este negocio.");
  if (target.added_by === null) {
    throw new Error("El perfil del propietario principal no se puede quitar.");
  }

  const links = await Promise.all([
    admin.from("business_members").delete().eq("user_id", targetId),
    admin.from("blocked_users").delete().eq("user_id", targetId),
    admin.from("profiles").delete().eq("id", targetId),
  ]);
  if (links.some((result) => result.error)) {
    throw new Error("No se pudieron quitar los vínculos del perfil.");
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(targetId);
  if (deleteError) throw new Error("No se pudo borrar la cuenta del perfil.");

  revalidatePath("/panel/cuenta");
}
