import Link from "next/link";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { ReviewDecisionForm } from "@/components/panel-review-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { formatCents, formatDateTime } from "@/lib/panel-format";
import { related } from "@/lib/panel-relations";
import { canManageCatalog } from "@/types/panel";

type ReviewService = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  category_id: string;
  base_price_cents: number | null;
  updated_at: string;
  businesses: { name: string } | { name: string }[] | null;
  categories: { label: string } | { label: string }[] | null;
  service_photos: Array<{ storage_path: string; is_cover: boolean; position: number }>;
};

// Bandeja de revisión: lista de envíos a la izquierda y la ficha con la decisión a la derecha.
export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ servicio?: string; categoria?: string }>;
}) {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "collaborator"]);
  const { servicio, categoria } = await searchParams;

  // Los más antiguos aparecen primero para atender primero los envíos más esperados.
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, description, address, category_id, base_price_cents, updated_at, " +
        "businesses(name), categories(label), service_photos(storage_path, is_cover, position)",
    )
    .eq("review_status", "pending")
    .order("updated_at", { ascending: true });
  if (error) throw new Error("No se pudo cargar la cola de revisión.");

  const all = (data ?? []) as unknown as ReviewService[];
  const counts = new Map<string, { label: string; count: number }>();
  for (const service of all) {
    const label = related(service.categories)?.label ?? "Sin categoría";
    const entry = counts.get(service.category_id) ?? { label, count: 0 };
    entry.count += 1;
    counts.set(service.category_id, entry);
  }
  const items = categoria ? all.filter((service) => service.category_id === categoria) : all;
  const selected = items.find((service) => service.id === servicio) ?? items[0];
  // El colaborador abre la vista previa porque no edita servicios.
  const isStaff = canManageCatalog(role);
  const hrefFor = (id: string) => {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    params.set("servicio", id);
    return `/panel/revision?${params}`;
  };
  const cover = selected
    ? [...selected.service_photos].sort((a, b) =>
      Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)[0]
    : undefined;
  const coverUrl = cover
    ? supabase.storage.from("service-media").getPublicUrl(cover.storage_path).data.publicUrl
    : null;

  return (
    <>
      <PageHeader
        title="Revisión"
        description="Servicios enviados por los negocios. Aprueba para publicar o pide cambios con un motivo claro."
        actions={<Badge tone={all.length ? "warning" : "success"}>{all.length} pendientes</Badge>}
      />
      {all.length > 0 && (
        <nav className="chip-row" aria-label="Filtrar por categoría">
          <Link className={`chip ${!categoria ? "active" : ""}`} href="/panel/revision">
            Todos <span>{all.length}</span>
          </Link>
          {[...counts.entries()].map(([id, entry]) => (
            <Link key={id} className={`chip ${categoria === id ? "active" : ""}`}
              href={`/panel/revision?categoria=${id}`}>
              {entry.label} <span>{entry.count}</span>
            </Link>
          ))}
        </nav>
      )}

      {!items.length ? (
        <Panel>
          <h2>Todo al día</h2>
          <p className="muted">No hay servicios pendientes de revisión.</p>
        </Panel>
      ) : (
        <div className="review-inbox">
          <nav className="review-list" aria-label="Servicios pendientes">
            {items.map((service) => (
              <Link key={service.id} href={hrefFor(service.id)}
                className={`review-item ${service.id === selected?.id ? "active" : ""}`}
                aria-current={service.id === selected?.id ? "true" : undefined}>
                <b>{service.name}</b>
                <small>
                  {related(service.businesses)?.name ?? "Negocio sin nombre"} ·{" "}
                  {related(service.categories)?.label ?? "Sin categoría"}
                </small>
                <small className="muted">Enviado {formatDateTime(service.updated_at)}</small>
              </Link>
            ))}
          </nav>
          {selected && (
            <div className="stack">
              <Panel className="review-detail">
                {coverUrl
                  ? <img src={coverUrl} alt={`Portada de ${selected.name}`} className="review-cover" />
                  : <div className="review-cover empty">Sin foto de portada</div>}
                <div className="section-heading">
                  <h2>{selected.name}</h2>
                  <Badge tone="warning">Pendiente de revisión</Badge>
                </div>
                <p className="muted">
                  {related(selected.businesses)?.name ?? "Negocio sin nombre"} ·{" "}
                  {related(selected.categories)?.label ?? "Sin categoría"}
                  {selected.address ? ` · ${selected.address}` : ""}
                </p>
                {selected.description && <p className="review-excerpt">{selected.description}</p>}
                <div className="chip-row">
                  <Badge tone="neutral">{selected.service_photos.length} fotos</Badge>
                  {selected.base_price_cents != null && (
                    <Badge tone="neutral">Desde {formatCents(selected.base_price_cents)}</Badge>
                  )}
                </div>
                <div className="actions">
                  {isStaff && (
                    <Link className="button secondary" href={`/panel/servicios/${selected.id}`}>
                      Abrir ficha completa
                    </Link>
                  )}
                  <Link className="button secondary"
                    href={`/panel/servicios/${selected.id}/vista-previa`}>
                    Ver vista previa
                  </Link>
                </div>
                {!isStaff && (
                  <p className="muted">
                    Como colaborador revisas la vista previa; la edición de la ficha es del
                    administrador.
                  </p>
                )}
              </Panel>
              <ReviewDecisionForm serviceId={selected.id} key={selected.id} />
            </div>
          )}
        </div>
      )}
    </>
  );
}
