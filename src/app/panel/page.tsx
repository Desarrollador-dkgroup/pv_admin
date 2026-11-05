import { CollaboratorOverview, OwnerOverview, StaffOverview } from "@/components/panel-overview";
import { getPanelIdentity } from "@/lib/panel-access";

// Muestra la portada que corresponde al rol validado: equipo, colaborador o propietario.
export default async function PanelHome() {
  const { supabase, role, businessIds, user } = await getPanelIdentity();

  if (role === "propietario") {
    const display = user.user_metadata?.display_name;
    return (
      <OwnerOverview
        supabase={supabase}
        businessIds={businessIds}
        profileName={typeof display === "string" ? display : undefined}
      />
    );
  }
  if (role === "collaborator") {
    return <CollaboratorOverview supabase={supabase} />;
  }
  return <StaffOverview supabase={supabase} role={role} />;
}
