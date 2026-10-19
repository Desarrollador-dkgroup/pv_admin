import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { canManageCatalog } from "@/types/panel";
import { formatCents, formatDate } from "@/lib/panel-format";
import { destinationRefOf, loadPromotionOptions } from "@/lib/panel-promotion-options";
import { remainingLabel } from "@/lib/panel-promotion-labels";

// Lista las promociones reales. El propietario ve solo las de sus negocios (RLS).
export default async function PromotionsPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "propietario"]);
  const isStaff = canManageCatalog(role);

  const [{ data, error }, { labels }] = await Promise.all([
    supabase
      .from("promotions")
      .select("*")
      .order("valid_to", { ascending: false }),
    loadPromotionOptions(supabase),
  ]);
  if (error) throw new Error("No se pudieron cargar las promociones.");

  const rows = data ?? [];
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{isStaff ? "Promociones" : "Mis promociones"}</h1>
          <p>
            {isStaff
              ? "Ofertas que se muestran en la web. El descuento se calcula con los precios."
              : "Promociones que tu negocio propuso o que se aplican a tus servicios."}
          </p>
        </div>
        {isStaff && (
          <Link className="button primary" href="/panel/promociones/nuevo">+ Nueva promoción</Link>
        )}
      </header>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Promoción</th>
                <th>Destino</th>
                <th>Precio</th>
                <th>Vigencia</th>
                <th>Estado</th>
                {isStaff && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((promotion) => {
                const ref = destinationRefOf(promotion);
                const expired = new Date(promotion.valid_to) < new Date();
                return (
                  <tr key={promotion.id}>
                    <td>
                      <b>{promotion.title}</b>
                      <small className="table-subtitle">{promotion.place_name}</small>
                    </td>
                    <td>{labels.get(ref) ?? "Sin destino"}</td>
                    <td>
                      {formatCents(promotion.promotional_price_cents)}
                      <small className="table-subtitle">
                        Regular {formatCents(promotion.regular_price_cents)}
                        {promotion.discount_percent ? ` · -${promotion.discount_percent}%` : ""}
                      </small>
                    </td>
                    <td>
                      {formatDate(promotion.valid_from)} – {formatDate(promotion.valid_to)}
                      <small className="table-subtitle">{remainingLabel(promotion.valid_to)}</small>
                    </td>
                    <td>
                      <Badge>
                        {expired ? "Vencida" : promotion.is_published ? "Publicada" : "Borrador"}
                      </Badge>
                    </td>
                    {isStaff && (
                      <td>
                        <Link
                          className="button secondary"
                          href={`/panel/promociones/${promotion.id}`}
                        >
                          Editar
                        </Link>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && <p className="muted">Aún no hay promociones registradas.</p>}
      </Panel>
    </>
  );
}
