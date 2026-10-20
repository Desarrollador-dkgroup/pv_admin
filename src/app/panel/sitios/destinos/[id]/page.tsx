import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { sitePhotoUrl } from "@/lib/panel-sites";

type SiteCard = {
  id: string;
  name: string;
  short_description: string | null;
  photo_storage_path: string | null;
  cities: { name?: string } | null;
};

// Detalle de un destino: sus sitios turísticos en tarjetas y el botón para editar el destino.
export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const destination = await supabase
    .from("destinations")
    .select("id, province_id, name, subtitle")
    .eq("id", id)
    .maybeSingle();
  if (destination.error) throw new Error("No se pudo cargar el destino.");
  if (!destination.data) notFound();
  const item = destination.data;

  const sites = await supabase
    .from("tourist_sites")
    .select("id, name, short_description, photo_storage_path, cities(name)")
    .eq("province_id", item.province_id)
    .order("sort_order")
    .order("name");
  if (sites.error) throw new Error("No se pudieron cargar los sitios del destino.");
  const siteCards = (sites.data ?? []) as unknown as SiteCard[];

  return (
    <>
      <header className="page-heading">
        <div>
          <Link className="back-link" href="/panel/sitios">← Volver a destinos</Link>
          <h1>{item.name}</h1>
          <p>{item.subtitle || `Provincia: ${item.province_id}`}</p>
        </div>
        <Link className="button secondary" href={`/panel/sitios/destinos/${item.id}/editar`}>
          Editar destino
        </Link>
      </header>

      <div className="destination-sites-heading">
        <h2>Sitios turísticos</h2>
        <Link
          className="button primary"
          href={`/panel/sitios/nuevo?provincia=${encodeURIComponent(item.province_id)}`}
        >
          + Nuevo sitio
        </Link>
      </div>

      {siteCards.length ? (
        <div className="site-card-grid">
          {siteCards.map((site) => {
            const photo = sitePhotoUrl(site.photo_storage_path);
            return (
              <Link key={site.id} className="site-card" href={`/panel/sitios/${site.id}`}>
                <div className="site-card-image">
                  {photo ? (
                    // La foto viene de una URL pública; no requiere optimización en el panel.
                    <img src={photo} alt="" />
                  ) : (
                    <span>Sin foto</span>
                  )}
                </div>
                <div className="site-card-body">
                  <h3>{site.name}</h3>
                  <p>{site.short_description || "Sin descripción breve"}</p>
                  <small>{site.cities?.name ?? "Sin ciudad"}</small>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Panel>
          <p className="muted">
            Este destino todavía no tiene sitios turísticos. Crea el primero con el botón de arriba.
          </p>
        </Panel>
      )}
    </>
  );
}
