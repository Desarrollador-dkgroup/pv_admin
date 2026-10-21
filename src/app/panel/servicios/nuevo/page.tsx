import { PanelServiceEditor } from "@/components/panel-service-editor";
import { getPanelIdentity } from "@/lib/panel-access";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ categoria?: string; tipo?: string; negocio?: string }>;

// Nuevo servicio: el propietario llega aquí con el tipo que eligió; el equipo, sin tipo.
export default async function NewServicePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { role } = await getPanelIdentity();
  // Los propietarios preparan un borrador desde sus cupos asignados. La creación
  // libre de servicios y categorías queda reservada al equipo interno.
  if (role === "propietario") redirect("/panel/servicios");
  const { categoria, tipo, negocio } = await searchParams;
  return (
    <PanelServiceEditor preset={{ categoryId: categoria, lodgingTypeId: tipo, businessId: negocio }} />
  );
}
