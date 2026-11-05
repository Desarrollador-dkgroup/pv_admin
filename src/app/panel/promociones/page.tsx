import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { formatCents } from "@/lib/panel-format";
import { loadPromotionFormData, scheduleLabel } from "@/lib/panel-service-promotions";
import { previewPromotion } from "@/lib/promotion-commission";
import { canManageCatalog } from "@/types/panel";
import { setServicePromotionActiveAction } from "./actions";

// Promociones de servicio del usuario. Cada una muestra su precio y su comisión.
export default async function PromotionsPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "propietario"]);

  const [{ data, error }, { options, termsByBusiness }] = await Promise.all([
    supabase
      .from("service_promotions")
      .select("*")
      .order("created_at", { ascending: false }),
    loadPromotionFormData(supabase),
  ]);
  if (error) throw new Error("No se pudieron cargar las promociones.");

  const rows = data ?? [];
  const isStaff = canManageCatalog(role);
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{isStaff ? "Promociones" : "Mis promociones"}</h1>
          <p>
            {isStaff
              ? "Promociones de todos los negocios. Se muestran en la categoría de promociones y en la ubicación del servicio."
              : "Promociones de tus servicios. Se muestran en la categoría de promociones y en la ubicación del servicio."}
          </p>
        </div>
        <Link className="button primary" href="/panel/promociones/nuevo">+ Nueva promoción</Link>
      </header>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Promoción</th>
                <th>Servicio</th>
                <th>Precio</th>
                <th>Vigencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((promotion) => {
                const service = options.find((item) => item.id === promotion.service_id);
                const room = service?.rooms.find((item) => item.id === promotion.room_type_id);
                const regularCents = promotion.room_type_id
                  ? (room?.priceCents ?? null)
                  : (service?.priceCents ?? null);
                const terms = service ? termsByBusiness[service.businessId] : null;
                const preview = terms && regularCents
                  ? previewPromotion(regularCents, Number(promotion.discount_pct), terms)
                  : null;
                return (
                  <tr key={promotion.id}>
                    <td>
                      <b>{promotion.title}</b>
                      <small className="table-subtitle">
                        {room ? `${room.name} · ` : ""}-{Number(promotion.discount_pct)}%
                      </small>
                    </td>
                    <td>{service?.name ?? "Servicio eliminado"}</td>
                    <td>
                      {preview ? formatCents(preview.finalPriceCents) : "Sin precio"}
                      <small className="table-subtitle">
                        Regular {formatCents(regularCents)}
                        {preview ? ` · comisión ${preview.commissionPct}%` : ""}
                      </small>
                    </td>
                    <td>{scheduleLabel(promotion)}</td>
                    <td>
                      <Badge>{promotion.is_active ? "Activa" : "Pausada"}</Badge>
                    </td>
                    <td>
                      <div className="actions">
                        <Link className="button secondary" href={`/panel/promociones/${promotion.id}`}>
                          Editar
                        </Link>
                        <form action={setServicePromotionActiveAction}>
                          <input type="hidden" name="promotion_id" value={promotion.id} />
                          <input
                            type="hidden"
                            name="next_active"
                            value={promotion.is_active ? "false" : "true"}
                          />
                          <button className="button quiet" type="submit">
                            {promotion.is_active ? "Pausar" : "Activar"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="muted">Aún no tienes promociones.</p>}
      </Panel>
    </>
  );
}
