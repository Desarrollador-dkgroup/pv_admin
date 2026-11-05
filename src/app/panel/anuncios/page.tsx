import Link from "next/link";
import Image from "next/image";
import { AdRequestReject } from "@/components/panel-ad-request-reject";
import { Badge, Button, ConfirmSubmit, PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { formatDate } from "@/lib/panel-format";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";
import { deleteAdAction, moveAdAction, setAdActiveAction } from "./actions";
import { takeAdRequestAction } from "./solicitudes-actions";

// Estado que ve cada rol: lo aprobado por el equipo se muestra como «Aprobada».
const REQUEST_STATUS: Record<string, { label: string; tone: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  solicitado: { label: "Solicitada", tone: "warning" },
  en_gestion: { label: "Aprobada", tone: "success" },
  documento_listo: { label: "Aprobada", tone: "success" },
  publicado: { label: "Publicada", tone: "success" },
  rechazado: { label: "Rechazada", tone: "danger" },
};

type RequestRow = {
  id: string;
  title: string;
  status: string;
  starts_on: string | null;
  ends_on: string | null;
  rejection_reason: string | null;
  notes: string | null;
  created_at: string;
  business_id: string;
  requested_by: string;
  businesses: { name: string } | { name: string }[] | null;
  service_promotions: { title: string } | { title: string }[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function dates(start: string | null, end: string | null) {
  if (!start && !end) return "Sin fechas definidas";
  return `Del ${start ? formatDate(start) : "inicio"} al ${end ? formatDate(end) : "sin fin"}`;
}

// Anuncios de la página principal. El equipo los administra; el propietario ve los suyos.
export default async function AdsPage() {
  const { role, businessIds } = await getPanelIdentity();
  const isStaff = canManageCatalog(role);
  const isOwner = role === "propietario";
  if (!isStaff && !isOwner) {
    return <Panel><p role="alert">Tu cuenta no administra anuncios.</p></Panel>;
  }

  const admin = getSupabaseAdminClient();
  const requestsQuery = admin
    .from("ad_requests")
    .select("id, title, status, starts_on, ends_on, rejection_reason, notes, created_at, business_id, requested_by, businesses(name), service_promotions(title)")
    .order("created_at", { ascending: false });
  const scopedRequests = isOwner ? requestsQuery.in("business_id", businessIds) : requestsQuery;

  // Los anuncios del propietario son los de sus promociones; el equipo ve todos.
  const adsQuery = admin
    .from("ads")
    .select("*, service_promotions!inner(title, services!inner(business_id, name))")
    .order("position");
  const scopedAds = isOwner ? adsQuery.in("service_promotions.services.business_id", businessIds) : adsQuery;

  const [{ data: requests }, { data: ads, error }] = await Promise.all([scopedRequests, scopedAds]);
  if (error) throw new Error("No se pudieron cargar los anuncios.");
  const requestRows = (requests ?? []) as unknown as RequestRow[];
  // Datos de contacto de quien pidió cada anuncio (solo lo ve el equipo).
  const requesterIds = [...new Set(requestRows.map((request) => request.requested_by))];
  const { data: requesters } = isStaff && requesterIds.length
    ? await admin.from("profiles").select("id, display_name, email").in("id", requesterIds)
    : { data: [] };
  const who = new Map((requesters ?? []).map((person) => [person.id, person]));
  const adRows = ads ?? [];

  return (
    <>
      <PageHeader
        title={isStaff ? "Anuncios" : "Mis anuncios"}
        description={isStaff
          ? "Solicitudes de los propietarios y anuncios que se muestran al entrar a la web."
          : "Pide anuncios para tus promociones y revisa cuándo se muestran."}
        actions={isStaff
          ? <Link className="button primary" href="/panel/anuncios/nuevo">+ Nuevo anuncio</Link>
          : <Link className="button primary" href="/panel/anuncios/solicitar">+ Solicitar anuncio</Link>}
      />

      <Panel>
        <h2>{isStaff ? "Solicitudes de anuncio" : "Mis solicitudes"}</h2>
        {requestRows.map((request) => {
          const status = REQUEST_STATUS[request.status] ?? { label: request.status, tone: "neutral" as const };
          const business = one(request.businesses);
          const promotion = one(request.service_promotions);
          return (
            <div className="list-row" key={request.id}>
              <div className="list-row-text">
                <b>{request.title}</b>
                <small>
                  {isStaff ? `${business?.name ?? "Negocio"} · ` : ""}
                  {promotion?.title ?? "Promoción"} · {dates(request.starts_on, request.ends_on)}
                </small>
                {isStaff && (
                  <small>
                    Contacto: {who.get(request.requested_by)?.display_name ?? "Sin nombre"} ·{" "}
                    {who.get(request.requested_by)?.email ?? "Sin correo"}
                  </small>
                )}
                {request.notes && <small>Notas: {request.notes}</small>}
                {request.rejection_reason && <small>Motivo: {request.rejection_reason}</small>}
              </div>
              <Badge tone={status.tone}>{status.label}</Badge>
              {isStaff && request.status === "solicitado" && (
                <div className="stack compact">
                  <form action={takeAdRequestAction}>
                    <input type="hidden" name="request_id" value={request.id} />
                    <button type="submit" className="button primary small">Aprobar solicitud</button>
                  </form>
                  <AdRequestReject requestId={request.id} />
                </div>
              )}
              {isStaff && request.status === "en_gestion" && (
                <div className="stack compact">
                  <small className="muted">
                    Para aprobarla, sube el documento del anuncio en{" "}
                    <Link className="text-link" href="/panel/contratos">Contratos ›</Link>.
                    Después podrás crear el anuncio desde aquí.
                  </small>
                  <AdRequestReject requestId={request.id} />
                </div>
              )}
              {isStaff && request.status === "documento_listo" && (
                <Link className="button primary small" href={`/panel/anuncios/nuevo?solicitud=${request.id}`}>
                  Crear anuncio
                </Link>
              )}
            </div>
          );
        })}
        {!requestRows.length && <p className="muted">No hay solicitudes de anuncio.</p>}
      </Panel>

      <Panel>
        <h2>{isStaff ? "Anuncios activos y programados" : "Anuncios de mis promociones"}</h2>
      </Panel>
      <div className="stack">
        {adRows.map((ad, index) => {
          const imageUrl = admin.storage.from("ads-media").getPublicUrl(ad.image_path).data.publicUrl;
          const promotion = one(ad.service_promotions);
          return (
            <article key={ad.id} className="panel ad-row">
              {isStaff && (
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
                    <Button type="submit" tone="quiet" disabled={index === adRows.length - 1}
                      aria-label="Bajar">▼</Button>
                  </form>
                </div>
              )}
              <Image src={imageUrl} alt={ad.title} width={200} height={100} unoptimized className="ad-thumb" />
              <div className="list-row-text">
                <h2>{ad.title}</h2>
                <small>{dates(ad.starts_on, ad.ends_on)}</small>
                <small className="brand-text">
                  {promotion
                    ? `Lleva a: ${promotion.title}`
                    : "Sin promoción: el botón solo cierra"}
                </small>
              </div>
              <Badge tone={ad.is_active ? "success" : "neutral"}>
                {ad.is_active ? "Activo" : "Pausado"}
              </Badge>
              {isStaff && (
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
              )}
            </article>
          );
        })}
      </div>
      {!adRows.length && (
        <div className="panel empty-state">
          <h2>{isStaff ? "Aún no hay anuncios" : "Aún no tienes anuncios"}</h2>
          <p className="muted">
            {isStaff ? "Crea el primero con el botón de arriba." : "Cuando el equipo publique tu anuncio, aparecerá aquí."}
          </p>
        </div>
      )}
    </>
  );
}

