import { notFound } from "next/navigation";
import {
  ServicePromotionForm,
  type ServicePromotionRecord,
} from "@/components/panel-service-promotion-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadPromotionFormData } from "@/lib/panel-service-promotions";

// Edita una promoción de servicio existente.
export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "propietario"]);

  const [{ data, error }, { options, termsByBusiness }] = await Promise.all([
    supabase.from("service_promotions").select("*").eq("id", id).maybeSingle(),
    loadPromotionFormData(supabase),
  ]);
  if (error) throw new Error("No se pudo cargar la promoción.");
  if (!data) notFound();

  const promotion: ServicePromotionRecord = {
    ...data,
    discount_pct: Number(data.discount_pct),
    schedule_mode: data.schedule_mode as ServicePromotionRecord["schedule_mode"],
    weekdays: data.weekdays ?? [],
  };
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{promotion.title}</h1>
          <p>Edita el descuento, la vigencia o los días en los que aplica.</p>
        </div>
      </header>
      <ServicePromotionForm services={options} termsByBusiness={termsByBusiness} promotion={promotion} />
    </>
  );
}
