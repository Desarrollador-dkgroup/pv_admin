import Link from "next/link";
import { SignedContractUpload } from "@/components/panel-signed-contract-upload";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { contractStatusLabel } from "@/lib/panel-contracts";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// El propietario ve el contrato de su negocio, lo imprime y sube la copia firmada.
export default async function MyContractPage() {
  const { role, businessIds } = await getPanelIdentity();
  requireRole(role, ["propietario", "owner", "admin"]);
  const businessId = businessIds[0];

  const admin = getSupabaseAdminClient();
  const { data: contract } = businessId
    ? await admin.from("business_contracts").select("*").eq("business_id", businessId).maybeSingle()
    : { data: null };
  const visible = contract && contract.status !== "draft";

  let signedUrl: string | null = null;
  if (visible && contract.signed_pdf_path) {
    const { data } = await admin.storage
      .from("contracts")
      .createSignedUrl(contract.signed_pdf_path, 300);
    signedUrl = data?.signedUrl ?? null;
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Mi contrato</h1>
          <p>Contrato de colaboración de tu negocio con Panamá Viajero.</p>
        </div>
      </header>
      {!visible || !businessId ? (
        <Panel>
          <p className="muted">Aún no tienes un contrato emitido. Te lo enviaremos cuando esté listo.</p>
        </Panel>
      ) : (
        <>
          <Panel>
            <h2>{contract.title}</h2>
            <p>Estado: <Badge>{contractStatusLabel(contract.status)}</Badge></p>
            <div className="actions">
              <Link className="button secondary" href={`/panel/contratos/${businessId}/imprimir`}>
                Ver e imprimir
              </Link>
              {signedUrl && (
                <a className="button primary" href={signedUrl} target="_blank" rel="noreferrer">
                  Ver copia firmada
                </a>
              )}
            </div>
          </Panel>
          {contract.status === "issued" && <SignedContractUpload businessId={businessId} />}
        </>
      )}
    </>
  );
}
