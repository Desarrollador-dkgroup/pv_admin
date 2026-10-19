import { createClient } from "@supabase/supabase-js";

// Cliente con la clave de servicio. Solo puede usarse desde acciones del servidor.
// La clave NO lleva prefijo NEXT_PUBLIC, así nunca llega al navegador.
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear cuentas.");
  }
  // Sin sesión persistente: este cliente solo sirve para operaciones administrativas puntuales.
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
