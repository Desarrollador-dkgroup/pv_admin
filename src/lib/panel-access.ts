import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { PanelRole } from "@/types/panel";

// Comprueba la sesión y el rol directamente en Supabase en cada ruta protegida.
export async function getPanelIdentity() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) redirect("/acceso?motivo=sesion");

  // Una contraseña temporal debe cambiarse antes de usar cualquier pantalla del panel.
  if (user.user_metadata?.must_change_password === true) redirect("/acceso?modo=temporal");

  // Consulta roles internos, negocios asignados y suspensión en paralelo.
  const [adminResult, membershipResult, blockedResult] = await Promise.all([
    supabase
      .from("platform_admins")
      .select("platform_role")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", user.id),
    supabase
      .from("blocked_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (adminResult.error || membershipResult.error || blockedResult.error) {
    throw new Error("No se pudo comprobar el rol de esta cuenta en Supabase.");
  }

  // Un rol interno tiene prioridad; si no existe, la cuenta es propietario de negocio.
  const role: PanelRole | null = adminResult.data?.platform_role
    ? adminResult.data.platform_role as PanelRole
    : membershipResult.data.length
      ? "propietario"
      : null;
  if (!role) redirect("/acceso?motivo=sin-negocio");

  return {
    supabase,
    user,
    role,
    businessIds: membershipResult.data.map((membership) => membership.business_id),
    // Las cuentas internas nunca quedan suspendidas desde el panel.
    suspended: role === "propietario" && Boolean(blockedResult.data),
  };
}

// Redirige a la pantalla de inicio cuando el rol actual no tiene acceso a la sección.
export function requireRole(role: PanelRole, allowed: PanelRole[]) {
  if (!allowed.includes(role)) redirect("/panel");
}
