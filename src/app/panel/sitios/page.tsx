import Link from "next/link";
import { Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { DESTINATION_IMAGE_BUCKET } from "@/lib/panel-destinations";

// Destinos (provincias) como tarjetas. Cada una lleva a sus sitios turísticos.
export default async function TouristSitesPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const [destinations, sites] = await Promise.all([
    supabase
      .from("destinations")
      .select("id, province_id, name, subtitle, card_image_storage_path")
      .order("sort_order")
      .order("name"),
    supabase.from("tourist_sites").select("province_id"),
  ]);
  if (destinations.error || sites.error) {
    throw new Error("No se pudieron cargar los destinos.");
  }

  // Cuenta los sitios de cada provincia para mostrarlo en la tarjeta.
  const counts = new Map<string, number>();
  for (const site of sites.data ?? []) {
    counts.set(site.province_id, (counts.get(site.province_id) ?? 0) + 1);
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Destinos</h1>
          <p>Cada tarjeta es un destino. Entra para configurarlo y ver sus sitios.</p>
        </div>
        <Link className="button primary" href="/panel/sitios/destinos/nuevo">
          + Añadir destino
        </Link>
      </header>

      {!destinations.data?.length ? (
        <Panel>
          <p className="muted">Aún no hay destinos. Añade el primero con el botón de arriba.</p>
        </Panel>
      ) : (
        <div className="destination-grid">
          {destinations.data.map((destination) => {
            const image = destination.card_image_storage_path
              ? supabase.storage
                .from(DESTINATION_IMAGE_BUCKET)
                .getPublicUrl(destination.card_image_storage_path).data.publicUrl
              : null;
            return (
              <Link
                key={destination.id}
                className="destination-tile"
                href={`/panel/sitios/destinos/${destination.id}`}
              >
                <div className="destination-tile-image">
                  {image ? (
                    // La imagen viene de Storage público; no requiere optimización del panel.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" />
                  ) : (
                    <span>Sin imagen</span>
                  )}
                </div>
                <div className="destination-tile-body">
                  <h2>{destination.name}</h2>
                  <p>{destination.subtitle || "Sin subtítulo"}</p>
                  <small>{counts.get(destination.province_id) ?? 0} sitios turísticos</small>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
