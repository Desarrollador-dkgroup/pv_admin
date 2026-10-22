import type { SupabaseClient } from "@supabase/supabase-js";

// Devuelve un mapa de identificador a nombre visible. Las cuentas sin perfil no aparecen
// y quien llama muestra un texto de respaldo.
export async function getAccountNames(supabase: SupabaseClient, ids: string[]) {
  const names = new Map<string, string>();
  if (!ids.length) return names;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  if (error) throw new Error("No se pudieron leer los nombres de las cuentas.");
  for (const profile of data ?? []) names.set(profile.id, profile.display_name);
  return names;
}

// Igual que getAccountNames, pero con la sesión del usuario: usa public_profile_for, que
// solo expone el nombre visible. No depende de la clave de servicio.
export async function getPublicNames(supabase: SupabaseClient, ids: string[]) {
  const names = new Map<string, string>();
  const results = await Promise.all(
    [...new Set(ids)].map((id) => supabase.rpc("public_profile_for", { p_user_id: id })),
  );
  for (const { data, error } of results) {
    if (error) throw new Error("No se pudieron leer los nombres de las cuentas.");
    for (const profile of (data ?? []) as { id: string; display_name: string }[]) {
      names.set(profile.id, profile.display_name);
    }
  }
  return names;
}

// Datos visibles de una cuenta: nombre y correo guardados en su perfil.
export type AccountProfile = { name: string; email: string | null };

// Devuelve nombre y correo por identificador; las cuentas sin perfil no aparecen.
export async function getAccountProfiles(supabase: SupabaseClient, ids: string[]) {
  const profiles = new Map<string, AccountProfile>();
  if (!ids.length) return profiles;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", ids);
  if (error) throw new Error("No se pudieron leer los datos de las cuentas.");
  for (const profile of data ?? []) {
    profiles.set(profile.id, { name: profile.display_name, email: profile.email });
  }
  return profiles;
}
