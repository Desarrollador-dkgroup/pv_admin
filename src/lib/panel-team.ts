import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import type { PanelRole } from "@/types/panel";

type ServerSupabase = Awaited<ReturnType<typeof getSupabaseServerClient>>;

// Estado de una cuenta dentro del equipo. "effectiveRole" es el rol que usa la matriz de
// permisos: una cuenta sin rol se trata como colaborador para decidir quién la administra.
export type TeamTarget = {
  error: string;
  teamRole: PanelRole | null;
  effectiveRole: PanelRole;
};

// Cuenta creada desde el panel que hoy no tiene rol de equipo (por ejemplo, tras eliminarla
// del equipo antes). Aparece en la lista para poder asignarle rol o eliminarla.
export type OrphanAccount = {
  userId: string;
  email: string;
  createdAt: string;
};

// Lee el rol de equipo de una cuenta. Si no tiene rol pero sí negocios, es propietario de
// negocio y no se gestiona desde Permisos.
export async function loadTeamTarget(
  supabase: ServerSupabase,
  userId: string,
): Promise<TeamTarget> {
  const [team, business] = await Promise.all([
    supabase
      .from("platform_admins")
      .select("platform_role")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("business_members")
      .select("business_id")
      .eq("user_id", userId)
      .limit(1),
  ]);
  if (team.error || business.error) {
    return { error: "No se pudo leer la cuenta.", teamRole: null, effectiveRole: "collaborator" };
  }

  const teamRole = (team.data?.platform_role as PanelRole | undefined) ?? null;
  if (!teamRole && business.data.length) {
    return {
      error: "Esta cuenta es propietario de negocio. Gestiónala desde Propietarios.",
      teamRole: null,
      effectiveRole: "propietario",
    };
  }
  return { error: "", teamRole, effectiveRole: teamRole ?? "collaborator" };
}

// Devuelve las cuentas creadas desde el panel que ya no tienen rol de equipo ni negocio.
// Usa la clave de servidor: quien llama debe capturar el error si la clave no está configurada.
export async function getOrphanAccounts(teamIds: string[]): Promise<OrphanAccount[]> {
  const admin = getSupabaseAdminClient();
  const [users, members] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("business_members").select("user_id"),
  ]);
  if (users.error || members.error) {
    throw new Error("No se pudieron revisar las cuentas sin rol de equipo.");
  }

  const taken = new Set<string>([
    ...teamIds,
    ...(members.data ?? []).map((member) => member.user_id as string),
  ]);
  return users.data.users
    .filter((user) => !taken.has(user.id) && user.user_metadata?.team_account === true)
    .map((user) => ({
      userId: user.id,
      email: user.email ?? "",
      createdAt: user.created_at,
    }));
}
