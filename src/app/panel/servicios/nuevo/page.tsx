import { PanelServiceEditor } from "@/components/panel-service-editor";

type SearchParams = Promise<{ categoria?: string; tipo?: string }>;

// Nuevo servicio: el propietario llega aquí con el tipo que eligió; el equipo, sin tipo.
export default async function NewServicePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { categoria, tipo } = await searchParams;
  return (
    <PanelServiceEditor preset={{ categoryId: categoria, lodgingTypeId: tipo }} />
  );
}
