import Link from "next/link";
import { Badge, ConfirmSubmit, PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { formatCents } from "@/lib/panel-format";
import { loadPromotionFormData, scheduleLabel } from "@/lib/panel-service-promotions";
import { previewPromotion } from "@/lib/promotion-commission";
import { canManageCatalog } from "@/types/panel";
import { deleteServicePromotionAction, setServicePromotionActiveAction } from "./actions";

// Promociones de servicio del usuario. Cada una muestra su precio y su comisión.
export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado = "" } = await searchParams;
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

  const all = data ?? [];
  const rows = estado === "activas"
    ? all.filter((promotion) => promotion.is_active)
    : estado === "pausadas"
      ? all.filter((promotion) => !promotion.is_active)
      : all;
  const isStaff = canManageCatalog(role);
  const filters = [
    { key: "", label: "Todas", count: all.length },
    { key: "activas", label: "Activas", count: all.filter((item) => item.is_active).length },
    { key: "pausadas", label: "Pausadas", count: all.filter((item) => !item.is_active).length },
  ];
  return (
    <>
      <PageHeader
        title={isStaff ? "Promociones" : "Mis promociones"}
        description={isStaff
          ? "Promociones de todos los negocios. Se muestran en la categoría de promociones y en la ubicación del servicio."
          : "Promociones de tus servicios. Se muestran en la categoría de promociones y en la ubicación del servicio."}
        actions={<Link className="button primary" href="/panel/promociones/nuevo">+ Nueva promoción</Link>}
      />
      <nav className="chip-row" aria-label="Filtrar promociones">
        {filters.map((item) => (
          <Link key={item.key} className={`chip ${estado === item.key ? "active" : ""}`}
            href={item.key ? `/panel/promociones?estado=${item.key}` : "/panel/promociones"}>
            {item.label} <span>{item.count}</span>
          </Link>
        ))}
      </nav>
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
                      <Badge tone={promotion.is_active ? "success" : "neutral"}>
                        {promotion.is_active ? "Activa" : "Pausada"}
                      </Badge>
                    </td>
                    <td>
                      <div className="actions">
                        <Link className="button secondary small" href={`/panel/promociones/${promotion.id}`}>
                          Editar
                        </Link>
                        <form action={setServicePromotionActiveAction}>
                          <input type="hidden" name="promotion_id" value={promotion.id} />
                          <input
                            type="hidden"
                            name="next_active"
                            value={promotion.is_active ? "false" : "true"}
                          />
                          <button className="button quiet small" type="submit">
                            {promotion.is_active ? "Pausar" : "Activar"}
                          </button>
                        </form>
                        <form action={deleteServicePromotionAction}>
                          <input type="hidden" name="promotion_id" value={promotion.id} />
                          <ConfirmSubmit tone="quiet" className="small" confirm={{
                            title: `¿Eliminar «${promotion.title}»?`,
                            body: "Deja de verse en la web y en los anuncios que la usen. No se puede deshacer.",
                            confirmLabel: "Eliminar promoción",
                            danger: true,
                          }}>
                            Eliminar
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="muted">
            {all.length ? "No hay promociones para este filtro." : "Aún no hay promociones."}
          </p>
        )}
      </Panel>
    </>
  );
}
