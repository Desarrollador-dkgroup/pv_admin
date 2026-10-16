import type { ReactNode } from "react";
import { PanelShell } from "@/components/panel-shell";
import { getPanelIdentity } from "@/lib/panel-access";

// Protege cada pantalla real y mantiene el rol validado en Supabase.
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { role } = await getPanelIdentity();
  return <PanelShell role={role}>{children}</PanelShell>;
}
