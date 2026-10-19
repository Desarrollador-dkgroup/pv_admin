import { CollaboratorOverview, OwnerOverview, StaffOverview } from "@/components/panel-overview";
import { getPanelIdentity } from "@/lib/panel-access";

// Muestra la portada que corresponde al rol validado: equipo, colaborador o propietario.
export default async function PanelHome() {
  const { supabase, role, businessIds } = await getPanelIdentity();

  if (role === "propietario") {
    return <OwnerOverview supabase={supabase} businessIds={businessIds} />;
  }
  if (role === "collaborator") {
    return <CollaboratorOverview supabase={supabase} />;
  }
  return <StaffOverview supabase={supabase} role={role} />;
}
