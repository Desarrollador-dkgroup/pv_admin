import { notFound } from "next/navigation";
import { ContractForm, type ContractFormValues } from "@/components/panel-contract-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { DEFAULT_CONTRACT_BODY, DEFAULT_CONTRACT_TITLE } from "@/lib/panel-contracts";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Crea o edita el contrato de un negocio. Los valores iniciales son de prueba.
export default async function EditContractPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const admin = getSupabaseAdminClient();
  const [{ data: business }, { data: contract }] = await Promise.all([
    admin.from("businesses").select("id, name").eq("id", businessId).maybeSingle(),
    admin.from("business_contracts").select("*").eq("business_id", businessId).maybeSingle(),
  ]);
  if (!business) notFound();

  const initial: ContractFormValues = {
    businessId: business.id,
    businessName: business.name,
    title: contract?.title ?? DEFAULT_CONTRACT_TITLE,
    templateBody: contract?.template_body || DEFAULT_CONTRACT_BODY,
    status: contract?.status === "issued" ? "issued" : "draft",
    baseCommissionPct: Number(contract?.base_commission_pct ?? 10),
    discountLimitPct: Number(contract?.discount_limit_pct ?? 30),
    targetProfitUsd: Number(contract?.target_profit_cents ?? 700) / 100,
    commissionCapPct: Number(contract?.commission_cap_pct ?? 40),
  };

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Contrato de {business.name}</h1>
          <p>Estado: {contract?.status === "signed" ? "firmado (solo lectura)" : "editable"}.</p>
        </div>
      </header>
      {contract?.status === "signed" ? (
        <p className="muted">Este contrato ya está firmado y no se puede modificar.</p>
      ) : (
        <ContractForm initial={initial} />
      )}
    </>
  );
}
