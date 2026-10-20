// Agrupa los cupos contratados (business_service_plans) junto a las fichas (services) que ya
// los usan, por negocio, categoría y tipo. Un servicio sin plan que lo respalde (asignado antes
// de que existiera el plan, o por el equipo fuera de un plan) nunca se pierde: aparece igual,
// solo que sin cupos libres para preparar otro.

export type ServicePlanRow = {
  business_id: string;
  category_id: string;
  category_label: string | null;
  hospedaje_type_id: string | null;
  hospedaje_type_label: string | null;
  quantity: number;
};

export type PlanServiceRow = {
  id: string;
  business_id: string;
  category_id: string;
  hospedaje_type_id: string | null;
  name: string;
  status: string;
  review_status: string;
};

export type PlanSlot = {
  hospedajeTypeId: string | null;
  hospedajeTypeLabel: string | null;
  quota: number;
  used: number;
  remaining: number;
  services: PlanServiceRow[];
};

export type PlanCategoryGroup = {
  categoryId: string;
  categoryLabel: string;
  slots: PlanSlot[];
};

export type BusinessPlanGroup = {
  businessId: string;
  categories: PlanCategoryGroup[];
};

type MutableSlot = {
  hospedajeTypeId: string | null;
  hospedajeTypeLabel: string | null;
  quota: number;
  services: PlanServiceRow[];
};

type MutableCategory = {
  categoryId: string;
  categoryLabel: string;
  slots: MutableSlot[];
};

export function groupServicePlans(
  plans: ServicePlanRow[],
  services: PlanServiceRow[],
): BusinessPlanGroup[] {
  const byBusiness = new Map<string, Map<string, MutableCategory>>();

  function categoryOf(businessId: string, categoryId: string, categoryLabel: string) {
    let categories = byBusiness.get(businessId);
    if (!categories) {
      categories = new Map();
      byBusiness.set(businessId, categories);
    }
    let category = categories.get(categoryId);
    if (!category) {
      category = { categoryId, categoryLabel, slots: [] };
      categories.set(categoryId, category);
    }
    return category;
  }

  function slotOf(
    category: MutableCategory,
    hospedajeTypeId: string | null,
    hospedajeTypeLabel: string | null,
  ) {
    let slot = category.slots.find((candidate) => candidate.hospedajeTypeId === hospedajeTypeId);
    if (!slot) {
      slot = { hospedajeTypeId, hospedajeTypeLabel, quota: 0, services: [] };
      category.slots.push(slot);
    } else if (!slot.hospedajeTypeLabel && hospedajeTypeLabel) {
      slot.hospedajeTypeLabel = hospedajeTypeLabel;
    }
    return slot;
  }

  // Primero las fichas reales: así ninguna desaparece, tenga o no un plan que la respalde.
  for (const service of services) {
    const category = categoryOf(service.business_id, service.category_id, service.category_id);
    const slot = slotOf(category, service.hospedaje_type_id, null);
    slot.services.push(service);
  }

  // Luego los cupos contratados: suman al cupo del grupo y aportan las etiquetas reales.
  for (const plan of plans) {
    const category = categoryOf(
      plan.business_id,
      plan.category_id,
      plan.category_label ?? plan.category_id,
    );
    if (plan.category_label) category.categoryLabel = plan.category_label;
    const slot = slotOf(category, plan.hospedaje_type_id, plan.hospedaje_type_label);
    slot.quota += plan.quantity;
  }

  const result: BusinessPlanGroup[] = [];
  for (const [businessId, categories] of byBusiness) {
    result.push({
      businessId,
      categories: [...categories.values()].map((category) => ({
        categoryId: category.categoryId,
        categoryLabel: category.categoryLabel,
        slots: category.slots.map((slot) => ({
          hospedajeTypeId: slot.hospedajeTypeId,
          hospedajeTypeLabel: slot.hospedajeTypeLabel,
          quota: slot.quota,
          used: slot.services.length,
          remaining: Math.max(0, slot.quota - slot.services.length),
          services: slot.services,
        })),
      })),
    });
  }
  return result;
}
