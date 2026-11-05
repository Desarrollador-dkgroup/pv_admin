import { notFound } from "next/navigation";
import {
  ServicePromotionForm,
  type ServicePromotionRecord,
} from "@/components/panel-service-promotion-form";
import { ConfirmSubmit, PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadPromotionFormData } from "@/lib/panel-service-promotions";
import { deleteServicePromotionAction } from "../actions";

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
      <PageHeader
        back={{ href: "/panel/promociones", label: "Volver a promociones" }}
        title={promotion.title}
        description="Edita el descuento, la vigencia o los días en los que aplica."
        actions={
          <form action={deleteServicePromotionAction}>
            <input type="hidden" name="promotion_id" value={promotion.id} />
            <ConfirmSubmit tone="quiet" confirm={{
              title: `¿Eliminar «${promotion.title}»?`,
              body: "Deja de verse en la web. No se puede deshacer.",
              confirmLabel: "Eliminar promoción",
              danger: true,
            }}>
              Eliminar promoción
            </ConfirmSubmit>
          </form>
        }
      />
      <ServicePromotionForm services={options} termsByBusiness={termsByBusiness} promotion={promotion} />
    </>
  );
}
