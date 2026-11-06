import Link from "next/link";
import { notFound } from "next/navigation";
import { ContractForm, RejectSignedContractForm, type ContractFormValues } from "@/components/panel-contract-form";
import { Badge, ConfirmSubmit, PageHeader, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import {
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_TITLE,
  contractFieldDefaults,
  contractStatusLabel,
  contractStatusTone,
  contractValuesFor,
  formatContractDate,
  renderContract,
} from "@/lib/panel-contracts";
import { formatCents, formatDate } from "@/lib/panel-format";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  newContractVersionAction,
  verifySignedContractAction,
  voidContractAction,
} from "../actions";

type Contract = {
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
  contact_email: string | null;
  starts_on: string | null;
  ends_on: string | null;
  signed_pdf_path: string | null;
  signed_at: string | null;
  issued_at: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  version: number;
  updated_at: string;
  contract_fields: Record<string, unknown> | null;
};

// Línea de tiempo del contrato: borrador, emitido, firma subida, verificado.
function Timeline({ contract }: { contract: Contract }) {
  const steps = [
    { label: "Emitido", date: contract.issued_at, done: Boolean(contract.issued_at) },
    { label: "Firma subida", date: contract.signed_at,
      done: contract.status === "submitted" || contract.status === "signed" },
    { label: "Verificado", date: contract.verified_at, done: contract.status === "signed" },
  ];
  return (
    <ol className="stepper-line" aria-label="Estado del contrato">
      <li data-step="1" className="done">Borrador</li>
      {steps.map((step, index) => (
        <li key={step.label} data-step={index + 2}
          className={step.done ? "done" : steps[index - 1]?.done !== false ? "current" : ""}>
          {step.label}
          {step.done && step.date ? ` · ${formatDate(step.date)}` : ""}
        </li>
      ))}
    </ol>
  );
}

// Crea o edita el contrato de un negocio; si ya se emitió, muestra su ciclo y acciones.
export default async function EditContractPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const [{ data: business }, { data: row }] = await Promise.all([
    admin.from("businesses").select("id, name").eq("id", businessId).maybeSingle(),
    admin.from("business_contracts").select("*").eq("business_id", businessId).maybeSingle(),
  ]);
  if (!business) notFound();
  const contract = row as Contract | null;
  const dateLabel = contract?.updated_at
    ? new Date(contract.updated_at).toLocaleDateString("es-PA")
    : "se asigna al guardar";

  if (!contract || contract.status === "draft") {
    const initial: ContractFormValues = {
      businessId: business.id,
      businessName: business.name,
      title: contract?.title ?? DEFAULT_CONTRACT_TITLE,
      templateBody: contract?.template_body || DEFAULT_CONTRACT_BODY,
      status: "draft",
      baseCommissionPct: Number(contract?.base_commission_pct ?? 10),
      discountLimitPct: Number(contract?.discount_limit_pct ?? 30),
      targetProfitUsd: Number(contract?.target_profit_cents ?? 700) / 100,
      commissionCapPct: Number(contract?.commission_cap_pct ?? 40),
      legalName: contract?.legal_name ?? "",
      taxId: contract?.tax_id ?? "",
      legalRepresentative: contract?.legal_representative ?? "",
      legalAddress: contract?.legal_address ?? "",
      contactEmail: contract?.contact_email ?? "",
      startsOn: contract?.starts_on ?? "",
      endsOn: contract?.ends_on ?? "",
      fields: contractFieldDefaults(contract?.contract_fields),
      dateLabel,
      version: contract?.version ?? 1,
    };
    return (
      <>
        <PageHeader
          back={{ href: "/panel/contratos", label: "Volver a contratos" }}
          title={`Contrato de ${business.name}`}
          description="Completa los datos y las condiciones. La vista previa se actualiza al escribir."
          actions={<Badge tone="neutral">Borrador · no visible para el negocio</Badge>}
        />
        <ContractForm initial={initial} />
      </>
    );
  }

  let signedUrl: string | null = null;
  if (contract.signed_pdf_path) {
    const { data } = await admin.storage.from("contracts")
      .createSignedUrl(contract.signed_pdf_path, 600);
    signedUrl = data?.signedUrl ?? null;
  }
  const text = renderContract(
    contract.template_body,
    contractValuesFor(contract, business.name, dateLabel),
  );

  return (
    <>
      <PageHeader
        back={{ href: "/panel/contratos", label: "Volver a contratos" }}
        title={`Contrato de ${business.name}`}
        description={`${contract.title} · versión ${contract.version}`}
        actions={
          <>
            <Badge tone={contractStatusTone(contract.status)}>
              {contractStatusLabel(contract.status)}
            </Badge>
            <Link className="button secondary" href={`/panel/contratos/${businessId}/imprimir`}>
              Ver e imprimir
            </Link>
          </>
        }
      />
      {contract.status !== "void" && <Timeline contract={contract} />}
      {contract.rejection_reason && contract.status === "issued" && (
        <div className="callout warning">
          <strong>Copia rechazada; esperando una nueva</strong>
          <span>Motivo enviado al negocio: «{contract.rejection_reason}»</span>
        </div>
      )}
      <div className="split">
        <Panel>
          <h2>Documento</h2>
          <div className="contract-paper">
            <h3>{contract.title}</h3>
            <pre className="contract-preview">{text}</pre>
          </div>
        </Panel>
        <div className="stack">
          {contract.status === "submitted" && (
            <Panel>
              <h2>Verificar la firma</h2>
              <p className="muted">
                Comprueba que la copia corresponde a la versión {contract.version} y está firmada
                por el representante legal.
              </p>
              {signedUrl && (
                <a className="button secondary" href={signedUrl} target="_blank" rel="noreferrer">
                  Abrir copia firmada (PDF)
                </a>
              )}
              <form action={verifySignedContractAction}>
                <input type="hidden" name="business_id" value={businessId} />
                <ConfirmSubmit tone="primary" confirm={{
                  title: "¿Aprobar la firma y activar el contrato?",
                  body: "El contrato quedará vigente y el negocio lo verá así en su panel.",
                  confirmLabel: "Aprobar firma",
                }}>
                  Aprobar firma y activar contrato
                </ConfirmSubmit>
              </form>
              <RejectSignedContractForm businessId={businessId} />
            </Panel>
          )}
          {contract.status === "signed" && signedUrl && (
            <Panel>
              <h2>Copia firmada</h2>
              <p className="muted">
                Subida el {formatDate(contract.signed_at)} · verificada el{" "}
                {formatDate(contract.verified_at)}. El enlace caduca en 10 minutos.
              </p>
              <a className="button secondary" href={signedUrl} target="_blank" rel="noreferrer">
                Ver copia firmada
              </a>
            </Panel>
          )}
          <Panel>
            <h2>Condiciones</h2>
            <dl className="kv">
              <dt>Comisión base</dt><dd>{Number(contract.base_commission_pct)} %</dd>
              <dt>Límite de descuento</dt><dd>{Number(contract.discount_limit_pct)} %</dd>
              <dt>Ganancia objetivo</dt><dd>{formatCents(Number(contract.target_profit_cents))}</dd>
              <dt>Tope de comisión</dt><dd>{Number(contract.commission_cap_pct)} %</dd>
              <dt>Vigencia</dt>
              <dd>
                {contract.starts_on
                  ? `${formatContractDate(contract.starts_on)} – ${formatContractDate(contract.ends_on)}`
                  : "Sin fechas"}
              </dd>
              <dt>Razón social</dt><dd>{contract.legal_name ?? "—"}</dd>
              <dt>RUC</dt><dd>{contract.tax_id ?? "—"}</dd>
              <dt>Representante</dt><dd>{contract.legal_representative ?? "—"}</dd>
            </dl>
          </Panel>
          <Panel>
            <h2>Versiones</h2>
            <p className="muted">
              Para cambiar un contrato emitido crea una nueva versión: vuelve a borrador y el
              negocio deberá firmarla otra vez.
            </p>
            <div className="actions">
              <form action={newContractVersionAction}>
                <input type="hidden" name="business_id" value={businessId} />
                <ConfirmSubmit tone="secondary" confirm={{
                  title: `¿Crear la versión ${contract.version + 1}?`,
                  body: "El contrato vuelve a borrador y deja de aplicarse hasta que lo emitas.",
                  confirmLabel: "Crear nueva versión",
                }}>
                  Nueva versión
                </ConfirmSubmit>
              </form>
              {contract.status !== "void" && (
                <form action={voidContractAction}>
                  <input type="hidden" name="business_id" value={businessId} />
                  <ConfirmSubmit tone="quiet" confirm={{
                    title: "¿Anular este contrato?",
                    body: "Deja de aplicarse a las promociones del negocio. Podrás crear una nueva versión.",
                    confirmLabel: "Anular contrato",
                    danger: true,
                  }}>
                    Anular contrato
                  </ConfirmSubmit>
                </form>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
