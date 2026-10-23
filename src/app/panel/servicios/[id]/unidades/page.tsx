import { redirect } from "next/navigation";

// Las habitaciones ahora se editan en la página del servicio, cada una con su galería.
export default async function LodgingUnitsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/panel/servicios/${id}#habitaciones`);
}
