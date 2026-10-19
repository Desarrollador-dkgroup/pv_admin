import { PromotionForm } from "@/components/panel-promotion-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { loadPromotionOptions } from "@/lib/panel-promotion-options";

// Formulario para crear una promoción con destinos reales de la base.
export default async function NewPromotionPage() {
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);
  const { destinations } = await loadPromotionOptions(supabase);

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Nueva promoción</h1>
          <p>Completa la oferta. El porcentaje de descuento se calcula al guardar.</p>
        </div>
      </header>
      <PromotionForm promotion={null} destinations={destinations} />
    </>
  );
}
