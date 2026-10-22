import { notFound } from "next/navigation";
import Link from "next/link";
import { PanelServiceEditor } from "@/components/panel-service-editor";
import { getPanelIdentity } from "@/lib/panel-access";

// Muestra la ficha real y accesos a sus datos relacionados.
export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "nuevo") notFound();
  const { supabase } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, category_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !service) notFound();

  return (
    <>
      <PanelServiceEditor serviceId={id} />
      <nav className="actions" aria-label="Administrar contenido relacionado">
        <Link className="button primary" href={`/panel/servicios/${id}/vista-previa`}>
          Vista previa guardada
        </Link>
        <Link className="button secondary" href={`/panel/servicios/${id}/galeria`}>
          Galería
        </Link>
        {service.category_id === "hospedaje" && (
          <Link className="button secondary" href={`/panel/servicios/${id}/unidades`}>
            Habitaciones y unidades
          </Link>
        )}
        {service.category_id === "restaurantes" && (
          <Link className="button secondary" href={`/panel/servicios/${id}/menu`}>
            Menú
          </Link>
        )}
      </nav>
    </>
  );
}
