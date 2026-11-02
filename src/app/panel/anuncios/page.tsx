import Link from "next/link";
import Image from "next/image";
import { Badge, Button, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { deleteAdAction, moveAdAction, setAdActiveAction } from "./actions";

// Anuncios de la página principal. El orden de esta lista es el orden en que se muestran.
export default async function AdsPage() {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const { data: ads, error } = await admin.from("ads").select("*").order("position");
  if (error) throw new Error("No se pudieron cargar los anuncios.");

  const rows = ads ?? [];
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Anuncios</h1>
          <p>Se muestran al entrar a la página principal. Usa las flechas para cambiar el orden.</p>
        </div>
        <Link className="button primary" href="/panel/anuncios/nuevo">+ Nuevo anuncio</Link>
      </header>
      <div className="dashboard-grid">
        {rows.map((ad, index) => {
          const imageUrl = admin.storage.from("ads-media").getPublicUrl(ad.image_path).data.publicUrl;
          return (
            <Panel key={ad.id}>
              <Image src={imageUrl} alt={ad.title} width={320} height={180} unoptimized
                style={{ width: "100%", height: "auto", borderRadius: 8 }} />
              <h2>{ad.title}</h2>
              <p className="muted">
                {ad.starts_on || ad.ends_on
                  ? `Vigencia: ${ad.starts_on ?? "siempre"} a ${ad.ends_on ?? "siempre"}`
                  : "Sin fechas de vigencia"}
              </p>
              <Badge>{ad.is_active ? "Activo" : "Pausado"}</Badge>
              <div className="actions">
                <form action={moveAdAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button type="submit" tone="quiet" disabled={index === 0}>Subir</Button>
                </form>
                <form action={moveAdAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button type="submit" tone="quiet" disabled={index === rows.length - 1}>Bajar</Button>
                </form>
                <form action={setAdActiveAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <input type="hidden" name="next_active" value={ad.is_active ? "false" : "true"} />
                  <Button type="submit" tone="secondary">{ad.is_active ? "Pausar" : "Activar"}</Button>
                </form>
                <form action={deleteAdAction}>
                  <input type="hidden" name="ad_id" value={ad.id} />
                  <Button type="submit" tone="quiet">Eliminar</Button>
                </form>
              </div>
            </Panel>
          );
        })}
      </div>
      {!rows.length && <p className="muted">Aún no hay anuncios.</p>}
    </>
  );
}
