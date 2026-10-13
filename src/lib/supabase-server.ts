import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Consulta la sesión verificada desde el servidor utilizando las cookies de Supabase.
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan las variables públicas de Supabase.");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        // Los Server Components consultan cookies; la escritura requiere una respuesta mutable.
        try {
          values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // La sesión del navegador conserva sus cookies mediante createBrowserClient.
        }
      },
    },
  });
}
