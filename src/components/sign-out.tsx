"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { Button } from "@/components/ui";

// Cierra la sesión real y retira la página protegida de la navegación actual.
export function SignOut() {
  const router = useRouter();
  const [error, setError] = useState("");
  return (
    <>
      <Button
        tone="secondary"
        onClick={async () => {
          const { error: failure } = await getSupabaseBrowserClient().auth.signOut();
          if (failure) {
            setError("No se pudo cerrar la sesión. Intenta nuevamente.");
            return;
          }
          router.replace("/acceso");
          router.refresh();
        }}
      >
        Cerrar sesión
      </Button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
