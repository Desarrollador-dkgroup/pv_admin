import Link from "next/link";
import Image from "next/image";
import { Badge, Button, ConfirmSubmit, PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { formatDate } from "@/lib/panel-format";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { deleteAdAction, moveAdAction, setAdActiveAction } from "./actions";

// Anuncios de la página principal. El orden de esta lista es el orden en que se muestran.
export default async function AdsPage() {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const { data: ads, error } = await admin
    .from("ads")
    .select("*, service_promotions(title, services(name))")
    .order("position");
  if (error) throw new Error("No se pudieron cargar los anuncios.");

  const rows = ads ?? [];
  return (
    <>
      <PageHeader
        title="Anuncios"
        description="Se muestran al entrar a la página principal, en este orden. Usa las flechas para reordenar."
        actions={<Link className="button primary" href="/panel/anuncios/nuevo">+ Nuevo anuncio</Link>}
      />
      <div className="stack">
        {rows.map((ad, index) => {
          const imageUrl = admin.storage.from("ads-media").getPublicUrl(ad.image_path).data.publicUrl;
          const promotion = Array.isArray(ad.service_promotions)
            ? ad.service_promotions[0] : ad.service_promotions;
          const service = promotion
            ? Array.isArray(promotion.services) ? promotion.services[0] : promotion.services
            : null;
          return (
            <article key={ad.id} className="panel ad-row">
              <div className="ad-order">
                <form action={moveAdAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" tone="quiet" disabled={index === 0} aria-label="Subir">▲</Button>
                </form>
                <span>{index + 1}</span>
                <form action={moveAdAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" tone="quiet" disabled={index === rows.length - 1}
                    aria-label="Bajar">▼</Button>
                </form>
              </div>
              <Image src={imageUrl} alt={ad.title} width={200} height={100} unoptimized
                className="ad-thumb" />
              <div className="list-row-text">
                <h2>{ad.title}</h2>
                <small>
                  {ad.starts_on || ad.ends_on
                    ? `Del ${ad.starts_on ? formatDate(ad.starts_on) : "inicio"} al ${
                      ad.ends_on ? formatDate(ad.ends_on) : "sin fin"}`
                    : "Sin fechas de vigencia"}
                </small>
                <small className="brand-text">
                  {promotion
                    ? `Botón «Descubrir» → ${promotion.title}${service?.name ? ` · ${service.name}` : ""}`
                    : "Sin promoción: el botón solo cierra"}
                </small>
              </div>
              <Badge tone={ad.is_active ? "success" : "neutral"}>
                {ad.is_active ? "Activo" : "Pausado"}
              </Badge>
              <div className="actions">
                <Link className="button secondary small" href={`/panel/anuncios/${ad.id}`}>Editar</Link>
                <form action={setAdActiveAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <input type="hidden" name="next_active" value={ad.is_active ? "false" : "true"} />
                  <Button type="submit" tone="quiet" className="small">
                    {ad.is_active ? "Pausar" : "Activar"}
                  </Button>
                </form>
                <form action={deleteAdAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <ConfirmSubmit tone="quiet" className="small" confirm={{
                    title: `¿Eliminar el anuncio «${ad.title}»?`,
                    body: "Se borra también su imagen. No se puede deshacer.",
                    confirmLabel: "Eliminar anuncio",
                    danger: true,
                  }}>
                    Eliminar
                  </ConfirmSubmit>
                </form>
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <div className="panel empty-state">
          <h2>Aún no hay anuncios</h2>
          <p className="muted">Crea el primero con el botón de arriba.</p>
        </div>
      )}
    </>
  );
}
