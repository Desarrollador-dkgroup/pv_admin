import { notFound } from "next/navigation";
import Link from "next/link";
import { LodgingCatalogManager } from "@/components/lodging-catalog-manager";
import { PanelServiceEditor } from "@/components/panel-service-editor";
import { getPanelIdentity } from "@/lib/panel-access";
import { loadLodgingCatalog } from "@/lib/panel-lodging-catalog";

// Muestra la ficha real, sus habitaciones (si es hospedaje) y accesos a datos relacionados.
export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "nuevo") notFound();
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, category_id, hospedaje_type_id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !service) notFound();

  // Las habitaciones viven en la misma página para añadir cada una con su galería.
  const canEditRooms = service.category_id === "hospedaje" && !!service.hospedaje_type_id &&
    role !== "collaborator" &&
    (role !== "propietario" || businessIds.includes(service.business_id));
  const catalog = canEditRooms ? await loadLodgingCatalog(supabase, id) : null;

  return (
    <>
      <PanelServiceEditor serviceId={id} />
      {catalog && service.hospedaje_type_id && (
        <LodgingCatalogManager
          serviceId={id}
          lodgingTypeId={service.hospedaje_type_id}
          isOwner={role === "propietario"}
          rooms={catalog.rooms}
          areas={catalog.areas}
          rates={catalog.rates}
          photos={catalog.photos}
        />
      )}
      <nav className="actions" aria-label="Administrar contenido relacionado"
        style={{ paddingBottom: 96 }}>
        <Link className="button primary" href={`/panel/servicios/${id}/vista-previa`}>
          Vista previa guardada
        </Link>
        <Link className="button secondary" href={`/panel/servicios/${id}/galeria`}>
          Galería general
        </Link>
        {service.category_id === "restaurantes" && (
          <Link className="button secondary" href={`/panel/servicios/${id}/menu`}>
            Menú
          </Link>
        )}
      </nav>
    </>
  );
}
