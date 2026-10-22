import { PanelServiceEditor } from "@/components/panel-service-editor";

type SearchParams = Promise<{ categoria?: string; tipo?: string; negocio?: string }>;

// Nuevo servicio: el propietario llega aquí con el tipo que eligió; el equipo, sin tipo.
export default async function NewServicePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { categoria, tipo, negocio } = await searchParams;
  return (
    <PanelServiceEditor
      preset={{ categoryId: categoria, lodgingTypeId: tipo, businessId: negocio }}
    />
  );
}
