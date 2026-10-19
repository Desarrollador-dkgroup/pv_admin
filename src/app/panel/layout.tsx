import type { ReactNode } from "react";
import { PanelShell } from "@/components/panel-shell";
import { SignOut } from "@/components/sign-out";
import { getPanelIdentity } from "@/lib/panel-access";
import { getPanelNotifications } from "@/lib/panel-notifications";

// Protege cada pantalla real, valida el rol en Supabase y carga los avisos del alcance.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { supabase, role, businessIds, suspended } = await getPanelIdentity();

  // Una cuenta de propietario suspendida no puede usar el panel.
  if (suspended) {
    return (
      <main className="suspended-screen">
        <section className="panel suspended-card">
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
  return <PanelShell role={role} notifications={notifications}>{children}</PanelShell>;
}
