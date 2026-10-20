import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { sitePhotoUrl } from "@/lib/panel-sites";

// Ficha completa de un sitio turístico: todos sus datos y los servicios vinculados.
export default async function TouristSiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const [site, links] = await Promise.all([
    supabase
      .from("tourist_sites")
      .select(
        "id, name, slug, description, short_description, province_id, sort_order, " +
          "photo_storage_path, updated_at, latitude, longitude, cities(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("service_tourist_sites").select("services(id, name)").eq("tourist_site_id", id),
  ]);
  if (site.error) throw new Error("No se pudo cargar el sitio turístico.");
  if (!site.data) notFound();
  const item = site.data;

  const destination = await supabase
    .from("destinations")
    .select("id")
    .eq("province_id", item.province_id)
    .maybeSingle();

  const city = (item.cities as { name?: string } | null)?.name ?? "Sin ciudad";
  type ServiceLink = { services: { id: string; name: string } | null };
  const services = ((links.data ?? []) as unknown as ServiceLink[])
    .map((row) => row.services)
    .filter((service): service is { id: string; name: string } => service !== null);
  const photo = sitePhotoUrl(item.photo_storage_path);
  const backHref = destination.data
    ? `/panel/sitios/destinos/${destination.data.id}`
    : "/panel/sitios";

  return (
    <>
      <header className="page-heading">
        <div>
          <Link className="back-link" href={backHref}>← Volver al destino</Link>
          <h1>{item.name}</h1>
          <p>Así se ve la información de este sitio en el panel.</p>
        </div>
        <Link className="button secondary" href={`/panel/sitios/${item.id}/editar`}>
          Editar sitio
        </Link>
      </header>

      <div className="site-detail">
        <Panel>
          <div className="site-photo-large">
            {photo ? (
              // La foto viene de una URL pública; no requiere optimización en el panel.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo} alt={item.name} />
            ) : (
              <span>Sin foto</span>
            )}
          </div>
          <dl className="site-facts">
            <div>
              <dt>Destino</dt>
              <dd>{item.province_id}</dd>
            </div>
            <div>
              <dt>Ciudad de referencia</dt>
              <dd>{city}</dd>
            </div>
            <div>
              <dt>Identificador (URL)</dt>
              <dd>{item.slug}</dd>
            </div>
            <div>
              <dt>Orden en la web</dt>
              <dd>{item.sort_order}</dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>
                {item.latitude != null && item.longitude != null
                  ? `${item.latitude}, ${item.longitude}`
                  : "Sin coordenadas"}
              </dd>
            </div>
            <div className="site-fact-wide">
              <dt>Descripción breve</dt>
              <dd>{item.short_description || "Sin descripción breve"}</dd>
            </div>
            <div className="site-fact-wide">
              <dt>Descripción</dt>
              <dd>{item.description}</dd>
            </div>
            <div>
              <dt>Última actualización</dt>
              <dd>
                {item.updated_at
                  ? new Date(item.updated_at).toLocaleDateString("es-PA", { dateStyle: "medium" })
                  : "Sin fecha"}
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <h2>Servicios vinculados</h2>
          {services.length ? (
            <ul className="destination-site-list">
              {services.map((service) => (
                <li key={service.id}>
                  <span>{service.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ningún servicio está vinculado a este sitio.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
