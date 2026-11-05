import { notFound } from "next/navigation";
import { PrintContractButton } from "@/components/print-contract-button";
import { getPanelIdentity } from "@/lib/panel-access";
import { formatContractDate, renderContract } from "@/lib/panel-contracts";
import { formatCents } from "@/lib/panel-format";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

// Versión imprimible del contrato, con los valores del negocio ya llenados.
export default async function PrintContractPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { role, businessIds } = await getPanelIdentity();
  if (!canManageCatalog(role) && !businessIds.includes(businessId)) notFound();

  const admin = getSupabaseAdminClient();
  const [{ data: business }, { data: contract }] = await Promise.all([
    admin.from("businesses").select("name").eq("id", businessId).maybeSingle(),
    admin.from("business_contracts").select("*").eq("business_id", businessId).maybeSingle(),
  ]);
  if (!business || !contract || contract.status === "draft") notFound();

  const text = renderContract(contract.template_body, {
    razon_social: contract.legal_name ?? business.name,
    ruc: contract.tax_id ?? "",
    representante: contract.legal_representative ?? "",
    direccion: contract.legal_address ?? "",
    vigencia_inicio: formatContractDate(contract.starts_on),
    vigencia_fin: formatContractDate(contract.ends_on),
    negocio: business.name,
    comision_base: String(Number(contract.base_commission_pct)),
    limite_descuento: String(Number(contract.discount_limit_pct)),
    ganancia_objetivo: formatCents(Number(contract.target_profit_cents)),
    tope_comision: String(Number(contract.commission_cap_pct)),
    fecha: new Date(contract.updated_at).toLocaleDateString("es-PA"),
  });

  return (
    <>
      <div className="no-print actions">
        <PrintContractButton />
      </div>
      <article className="contract-print">
        <h1>{contract.title}</h1>
        <pre>{text}</pre>
      </article>
    </>
  );
}
