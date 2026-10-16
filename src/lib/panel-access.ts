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

  if (authError || !user) redirect("/acceso");

  const [adminResult, membershipResult] = await Promise.all([
    supabase
      .from("platform_admins")
      .select("platform_role")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", user.id),
  ]);

  if (adminResult.error || membershipResult.error) {
    throw new Error("No se pudo comprobar el rol de esta cuenta en Supabase.");
  }

  const role: PanelRole | null = adminResult.data?.platform_role
    ? adminResult.data.platform_role as PanelRole
    : membershipResult.data.length
      ? "propietario"
      : null;
  if (!role) redirect("/acceso");

  return {
    supabase,
    user,
    role,
    businessIds: membershipResult.data.map((membership) => membership.business_id),
  };
}
