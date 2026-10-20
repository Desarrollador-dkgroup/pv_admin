import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { DestinationForm } from "@/components/panel-destination-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { DESTINATION_IMAGE_BUCKET } from "@/lib/panel-destinations";

// Edición de un destino: muestra su configuración actual para cambiarla.
export default async function EditDestinationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const destination = await supabase
    .from("destinations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (destination.error) throw new Error("No se pudo cargar el destino.");
  if (!destination.data) notFound();
  const item = destination.data;

  const publicUrl = (path: string | null) =>
    path ? supabase.storage.from(DESTINATION_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl : null;

  return (
    <>
      <header className="page-heading">
        <div>
          <Link className="back-link" href={`/panel/sitios/destinos/${item.id}`}>
            ← Volver al destino
          </Link>
          <h1>Editar {item.name}</h1>
          <p>Cambia los datos, las imágenes o el mapa que verán los visitantes.</p>
        </div>
      </header>
      <Panel>
        <DestinationForm
          initial={{
            id: item.id,
            provinceId: item.province_id,
            name: item.name,
            subtitle: item.subtitle ?? "",
            description: item.description ?? "",
            cardImagePath: item.card_image_storage_path ?? "",
            cardImageUrl: publicUrl(item.card_image_storage_path),
            bannerImagePath: item.banner_image_storage_path ?? "",
            bannerImageUrl: publicUrl(item.banner_image_storage_path),
            mapsEmbed: item.maps_embed_url ?? "",
          }}
          provinces={[]}
          isNew={false}
        />
      </Panel>
    </>
  );
}
