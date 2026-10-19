import Link from "next/link";
import { Badge, Button, Panel } from "@/components/ui";
import { ReviewRejectForm } from "@/components/panel-review-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { formatDateTime } from "@/lib/panel-format";
import { related } from "@/lib/panel-relations";
import { approveServiceAction } from "./actions";

// Lista los servicios enviados por los negocios que esperan aprobación del equipo.
export default async function ReviewPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  // Los más antiguos aparecen primero para atender primero los envíos más esperados.
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, description, updated_at, businesses(name), categories(label), cities(name)",
    )
    .eq("review_status", "pending")
    .order("updated_at", { ascending: true });
  if (error) throw new Error("No se pudo cargar la cola de revisión.");

  const items = data ?? [];

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Revisión</h1>
          <p>Servicios enviados por los negocios. Aprueba para publicar o pide cambios.</p>
        </div>
        <Badge>{items.length} pendientes</Badge>
      </header>

      {items.map((service) => (
        <Panel className="review-card" key={service.id}>
          <div className="review-card-head">
            <div>
              <h2>{service.name}</h2>
              <small>
                {related(service.businesses)?.name ?? "Negocio sin nombre"} ·{" "}
                {related(service.categories)?.label ?? "Sin categoría"} ·{" "}
                {related(service.cities)?.name ?? "Sin ciudad"}
              </small>
            </div>
            <small>Enviado {formatDateTime(service.updated_at)}</small>
          </div>
          <p className="review-excerpt">{service.description}</p>
          <div className="actions">
            <Link className="button secondary" href={`/panel/servicios/${service.id}`}>
              Revisar ficha
            </Link>
            <form action={approveServiceAction}>
              <input type="hidden" name="service_id" value={service.id} />
              <Button type="submit">Aprobar y publicar</Button>
            </form>
          </div>
          <ReviewRejectForm serviceId={service.id} />
        </Panel>
      ))}

      {!items.length && (
        <Panel>
          <h2>Todo al día</h2>
          <p className="muted">No hay servicios pendientes de revisión.</p>
        </Panel>
      )}
    </>
  );
}
