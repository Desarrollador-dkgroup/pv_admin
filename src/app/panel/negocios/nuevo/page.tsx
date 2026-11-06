import { NewBusinessForm } from "@/components/panel-new-business-form";
import { PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";

// Crea un negocio para un propietario existente (o uno nuevo que se asignará después).
export default async function NewBusinessPage() {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "collaborator"]);
  return (
    <>
      <PageHeader
        back={{ href: "/panel/negocios", label: "Volver a negocios" }}
        title="Nuevo negocio"
        description="Crea el negocio y luego asígnale su propietario desde su ficha."
      />
      <Panel>
        <NewBusinessForm />
      </Panel>
    </>
  );
}
