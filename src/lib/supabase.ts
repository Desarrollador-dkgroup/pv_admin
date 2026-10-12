"use client";

import { createBrowserClient } from "@supabase/ssr";

// Usa el mismo proyecto de Supabase y la sesión autenticada del navegador.
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) throw new Error("Faltan las variables públicas de Supabase.");
  return createBrowserClient(url, key);
}
