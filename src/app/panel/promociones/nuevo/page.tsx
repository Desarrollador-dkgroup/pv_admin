import { ServicePromotionForm } from "@/components/panel-service-promotion-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadPromotionFormData } from "@/lib/panel-service-promotions";

// Crea una promoción para uno de tus servicios.
export default async function NewPromotionPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin", "propietario"]);
  const { options, termsByBusiness } = await loadPromotionFormData(supabase);

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Nueva promoción</h1>
          <p>Elige el servicio, el descuento y cuándo aplica. La vista previa muestra el precio y la comisión.</p>
        </div>
      </header>
      <ServicePromotionForm services={options} termsByBusiness={termsByBusiness} promotion={null} />
    </>
  );
}
