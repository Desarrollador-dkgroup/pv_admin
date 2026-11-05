import Link from "next/link";
import { redirect } from "next/navigation";
import { SignedContractUpload } from "@/components/panel-signed-contract-upload";
import { Badge, PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import {
  contractStatusLabel,
  contractStatusTone,
  formatContractDate,
  renderContract,
} from "@/lib/panel-contracts";
import { formatCents, formatDate } from "@/lib/panel-format";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

type Contract = {
  business_id: string;
  title: string;
  status: string;
  template_body: string;
  base_commission_pct: number;
  discount_limit_pct: number;
  target_profit_cents: number;
  commission_cap_pct: number;
  legal_name: string | null;
  tax_id: string | null;
  legal_representative: string | null;
  legal_address: string | null;
  starts_on: string | null;
  ends_on: string | null;
  signed_pdf_path: string | null;
  signed_at: string | null;
  issued_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  version: number;
  updated_at: string;
};

// El propietario ve el contrato de cada negocio, lo imprime y sube la copia firmada.
export default async function MyContractPage() {
  const { role, businessIds } = await getPanelIdentity();
  if (canManageCatalog(role)) redirect("/panel/contratos");
  requireRole(role, ["propietario"]);

  const admin = getSupabaseAdminClient();
  const [{ data: businesses }, { data: rows }] = businessIds.length
    ? await Promise.all([
      admin.from("businesses").select("id, name").in("id", businessIds),
      admin.from("business_contracts").select("*").in("business_id", businessIds)
        .neq("status", "draft"),
    ])
    : [{ data: [] }, { data: [] }];
  const contracts = (rows ?? []) as Contract[];
  const nameOf = new Map((businesses ?? []).map((business) => [business.id, business.name]));

  // Documentos de anuncios firmados por el propietario (confirman el pago por la publicación).
  const { data: adDocs } = businessIds.length
    ? await admin.from("ad_requests").select("id, title, document_path, created_at, status")
      .in("business_id", businessIds).not("document_path", "is", null).order("created_at", { ascending: false })
    : { data: [] };
  const adDocLinks = await Promise.all((adDocs ?? []).map(async (doc) => ({
    ...doc,
    url: (await admin.storage.from("contracts").createSignedUrl(doc.document_path ?? "", 600)).data?.signedUrl ?? null,
  })));

  const signedUrls = new Map<string, string>();
  for (const contract of contracts) {
    if (!contract.signed_pdf_path) continue;
    const { data } = await admin.storage.from("contracts")
      .createSignedUrl(contract.signed_pdf_path, 600);
    if (data?.signedUrl) signedUrls.set(contract.business_id, data.signedUrl);
  }

  return (
    <>
      <PageHeader
        title="Mi contrato"
        description="Contrato de colaboración de tu negocio con Panamá Viajero."
      />
      {!contracts.length && (
        <Panel className="empty-state">
          <span className="confirm-icon" aria-hidden="true">✎</span>
          <h2>Aún no tienes un contrato emitido</h2>
          <p className="muted">Te avisaremos en Notificaciones cuando esté listo para firmar.</p>
        </Panel>
      )}
      {contracts.map((contract) => {
        const businessName = nameOf.get(contract.business_id) ?? "Tu negocio";
        const text = renderContract(contract.template_body, {
          negocio: businessName,
          razon_social: contract.legal_name ?? businessName,
          ruc: contract.tax_id ?? "",
          representante: contract.legal_representative ?? "",
          direccion: contract.legal_address ?? "",
          vigencia_inicio: formatContractDate(contract.starts_on),
          vigencia_fin: formatContractDate(contract.ends_on),
          comision_base: String(Number(contract.base_commission_pct)),
          limite_descuento: String(Number(contract.discount_limit_pct)),
          ganancia_objetivo: formatCents(Number(contract.target_profit_cents)),
          tope_comision: String(Number(contract.commission_cap_pct)),
          fecha: new Date(contract.updated_at).toLocaleDateString("es-PA"),
        });
        const signedUrl = signedUrls.get(contract.business_id);
        return (
          <section key={contract.business_id} className="stack">
            {contracts.length > 1 && <h2>{businessName}</h2>}
            <ol className="stepper-line" aria-label="Estado del contrato">
              <li data-step="1" className="done">
                Emitido{contract.issued_at ? ` · ${formatDate(contract.issued_at)}` : ""}
              </li>
              <li data-step="2" className={contract.status === "issued" ? "current" : "done"}>
                Tu firma
              </li>
              <li data-step="3" className={contract.status === "submitted" ? "current"
                : contract.status === "signed" ? "done" : ""}>
                Verificación del equipo
              </li>
              <li data-step="4" className={contract.status === "signed" ? "done" : ""}>Vigente</li>
            </ol>
            {contract.status === "issued" && contract.rejection_reason && (
              <div className="callout danger" role="alert">
                <strong>El equipo rechazó tu copia firmada</strong>
                <span>«{contract.rejection_reason}». Sube una copia nueva.</span>
              </div>
            )}
            {contract.status === "submitted" && (
              <div className="callout">
                <strong>Estamos verificando tu copia firmada</strong>
                <span>La subiste el {formatDate(contract.signed_at)}. Te avisaremos al terminar.</span>
              </div>
            )}
            {contract.status === "signed" && (
              <div className="callout success">
                <strong>Tu contrato está vigente</strong>
                <span>El equipo verificó tu copia firmada el {formatDate(contract.verified_at)}.</span>
              </div>
            )}
            {contract.status === "void" && (
              <div className="callout warning">
                <strong>Este contrato fue anulado</strong>
                <span>El equipo te enviará una nueva versión.</span>
              </div>
            )}
            <div className="split">
              <Panel>
                <div className="section-heading">
                  <h2>{contract.title} · versión {contract.version}</h2>
                  <Badge tone={contractStatusTone(contract.status)}>
                    {contractStatusLabel(contract.status)}
                  </Badge>
                </div>
                <div className="actions">
                  <Link className="button secondary"
                    href={`/panel/contratos/${contract.business_id}/imprimir`}>
                    Ver, imprimir o descargar
                  </Link>
                  {signedUrl && (
                    <a className="button secondary" href={signedUrl} target="_blank" rel="noreferrer">
                      Ver copia firmada
                    </a>
                  )}
                </div>
                <div className="contract-paper">
                  <h3>{contract.title}</h3>
                  <pre className="contract-preview">{text}</pre>
                </div>
              </Panel>
              <div className="stack">
                {contract.status === "issued" && (
                  <Panel>
                    <h2>Firma tu contrato</h2>
                    <ol className="steps-list">
                      <li><b>Descárgalo o imprímelo</b><small>Usa «Ver, imprimir o descargar».</small></li>
                      <li><b>Fírmalo</b><small>Firma el representante legal en la última página.</small></li>
                      <li><b>Sube la copia firmada</b><small>Un solo PDF de hasta 10 MB.</small></li>
                    </ol>
                    <SignedContractUpload businessId={contract.business_id} />
                  </Panel>
                )}
                <Panel>
                  <h2>Condiciones de tu contrato</h2>
                  <dl className="kv">
                    <dt>Comisión base</dt><dd>{Number(contract.base_commission_pct)} %</dd>
                    <dt>Puedes descontar sin cambios hasta</dt>
                    <dd>{Number(contract.discount_limit_pct)} %</dd>
                    <dt>Ganancia mínima por reserva</dt>
                    <dd>{formatCents(Number(contract.target_profit_cents))}</dd>
                    <dt>La comisión nunca pasa de</dt><dd>{Number(contract.commission_cap_pct)} %</dd>
                    <dt>Vigencia</dt>
                    <dd>
                      {contract.starts_on
                        ? `${formatContractDate(contract.starts_on)} – ${formatContractDate(contract.ends_on)}`
                        : "Sin fechas"}
                    </dd>
                  </dl>
                  <small className="muted">
                    Si un descuento supera el límite, la comisión sube solo lo necesario para
                    conservar la ganancia mínima, sin pasar del tope.
                  </small>
                </Panel>
              </div>
            </div>
          </section>
        );
      })}
      {adDocLinks.length > 0 && (
        <Panel>
          <h2>Documentos de anuncios</h2>
          <p className="muted">Documentos firmados para la publicación de tus anuncios.</p>
          {adDocLinks.map((doc) => (
            <div className="list-row" key={doc.id}>
              <div className="list-row-text">
                <b>{doc.title}</b>
                <small>Subido el {formatDate(doc.created_at)}</small>
              </div>
              {doc.url && (
                <a className="button secondary small" href={doc.url} target="_blank" rel="noreferrer">
                  Ver documento
                </a>
              )}
            </div>
          ))}
        </Panel>
      )}
    </>
  );
}
