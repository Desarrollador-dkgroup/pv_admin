import { notFound } from "next/navigation";
import { PromotionForm, type PromotionRecord } from "@/components/panel-promotion-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { destinationRefOf, loadPromotionOptions } from "@/lib/panel-promotion-options";

// Edita una promoción existente en la misma pestaña.
export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const [{ data, error }, { destinations }] = await Promise.all([
    supabase.from("promotions").select("*").eq("id", id).maybeSingle(),
    loadPromotionOptions(supabase),
  ]);
  if (error) throw new Error("No se pudo cargar la promoción.");
  if (!data) notFound();

  const promotion: PromotionRecord = {
    ...data,
    destination_ref: destinationRefOf(data),
  };
  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{promotion.title}</h1>
          <p>Edita la oferta, sus precios y su publicación.</p>
        </div>
      </header>
      <PromotionForm promotion={promotion} destinations={destinations} />
    </>
  );
}
