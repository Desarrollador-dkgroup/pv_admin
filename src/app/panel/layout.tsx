import type { ReactNode } from "react";
import { PanelShell } from "@/components/panel-shell";
import { SignOut } from "@/components/sign-out";
import { getPanelIdentity } from "@/lib/panel-access";
import { getAccountNames } from "@/lib/panel-people";
import { getPanelNotifications } from "@/lib/panel-notifications";

// Protege cada pantalla real, valida el rol en Supabase y carga los avisos del alcance.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { supabase, role, businessIds, suspended, user } = await getPanelIdentity();

  // Una cuenta de propietario suspendida no puede usar el panel.
  if (suspended) {
    return (
      <main className="suspended-screen">
        <section className="panel suspended-card">
          <span className="confirm-icon danger" aria-hidden="true">!</span>
          <h1>Tu cuenta está suspendida</h1>
          <p>
            El equipo de Panamá Viajero suspendió el acceso de esta cuenta.
            Si crees que es un error, comunícate con el equipo para revisarlo.
          </p>
          <SignOut />
        </section>
      </main>
    );
  }

  const notifications = await getPanelNotifications(supabase, role, businessIds);
  // Nombre de la cuenta: primero el de los metadatos y luego el de la tabla profiles.
  // Si no hay nombre, la barra lateral no muestra nada (nunca el correo).
  const names = await getAccountNames(supabase, [user.id]);
  const metaName = user.user_metadata?.display_name;
  const profileName = String(
    (typeof metaName === "string" && metaName.trim()) || names.get(user.id) || "",
  ).trim();
  return (
    <PanelShell role={role} notifications={notifications} profileName={profileName}>
      {children}
    </PanelShell>
  );
}
