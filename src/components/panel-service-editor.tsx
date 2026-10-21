import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { ServiceEditorForm } from "@/components/service-editor-form";
import { getPanelIdentity } from "@/lib/panel-access";
import { loadOwnerPlanUsage } from "@/lib/panel-service-plan";
import { canManageCatalog } from "@/types/panel";

// Carga catálogos y relaciones reales antes de mostrar el formulario.
export async function PanelServiceEditor({
  serviceId,
  preset = {},
}: {
  serviceId?: string;
  preset?: { categoryId?: string; lodgingTypeId?: string };
}) {
  const { supabase, role, businessIds, user } = await getPanelIdentity();
  const ownerName = String(user.user_metadata?.display_name ?? user.email ?? "");
  if (role === "collaborator") redirect("/panel/permisos");
  const businessQuery = supabase
    .from("businesses")
    .select("id, name")
    .order("name");
  const scopedBusinessQuery = canManageCatalog(role)
    ? businessQuery
    : businessQuery.in("id", businessIds);

  const [businessResult, categoryResult, typeResult, siteResult, destinationResult,
    amenityResult, featureResult, mealPlanResult, serviceResult] =
    await Promise.all([
      scopedBusinessQuery,
      supabase.from("categories").select("id, label").order("sort_order"),
      supabase.from("hospedaje_types").select("id, label").order("sort_order"),
      supabase
        .from("tourist_sites")
        .select("id, name, province_id")
        .order("name"),
      supabase.from("destinations").select("province_id, name").order("sort_order").order("name"),
      supabase.from("amenities").select("id, label").order("sort_order"),
      supabase
        .from("restaurant_feature_catalog")
        .select("id, label")
        .order("sort_order"),
      supabase.from("meal_plans").select("id, label").order("sort_order"),
      serviceId
        ? supabase.from("services").select("*").eq("id", serviceId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  if (
    businessResult.error ||
    categoryResult.error ||
    typeResult.error ||
    siteResult.error ||
    destinationResult.error ||
    amenityResult.error ||
    featureResult.error ||
    mealPlanResult.error ||
    serviceResult.error
  ) {
    throw new Error("No se pudieron cargar los catálogos de Supabase.");
  }

  const service = serviceResult.data ?? {};
  if (serviceId && (!serviceResult.data ||
    (role === "propietario" && !businessIds.includes(String(service.business_id))))) {
    notFound();
  }
  const [lodgingResult, restaurantResult, scheduleResult, siteLinks,
    amenityLinks, featureLinks] = serviceId
    ? await Promise.all([
        supabase
          .from("lodging_profiles")
          .select("*")
          .eq("service_id", serviceId)
          .maybeSingle(),
        supabase
          .from("restaurant_profiles")
          .select("*")
          .eq("service_id", serviceId)
          .maybeSingle(),
        supabase
          .from("restaurant_hours")
          .select("day_of_week, opens_at, closes_at, position")
          .eq("service_id", serviceId)
          .order("day_of_week")
          .order("position"),
        supabase
          .from("service_tourist_sites")
          .select("tourist_site_id")
          .eq("service_id", serviceId),
        supabase
          .from("service_amenities")
          .select("amenity_id")
          .eq("service_id", serviceId),
        supabase
          .from("restaurant_service_features")
          .select("feature_id")
          .eq("service_id", serviceId),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (
    lodgingResult.error || restaurantResult.error || scheduleResult.error ||
    siteLinks.error || amenityLinks.error || featureLinks.error
  ) {
    throw new Error("No se pudo cargar la ficha específica del servicio.");
  }

  const weeklyHours = Array.from({ length: 7 }, (_, day) =>
    (scheduleResult.data ?? [])
      .filter((period) => period.day_of_week === day)
      .map((period) => `${period.opens_at.slice(0, 5)}-${period.closes_at.slice(0, 5)}`)
      .join(", "),
  );
  const restaurant = {
    ...(restaurantResult.data ?? {}),
    weekly_hours: weeklyHours,
  };

  const businesses = businessResult.data ?? [];
  if (!businesses.length) {
    return (
      <Panel>
        <h1>Falta asignar un negocio</h1>
        <p>Un administrador debe asociar esta cuenta con un negocio antes de crear servicios.</p>
      </Panel>
    );
  }

  // El propietario elige primero qué servicio añadir, según los cupos de su plan.
  const isStaff = canManageCatalog(role);
  let categories = categoryResult.data ?? [];
  let lodgingTypes = typeResult.data ?? [];
  let presetLodgingTypeId = "";
  if (!serviceId && !isStaff) {
    const usage = await loadOwnerPlanUsage(supabase, businesses[0].id);
    const open = usage.filter((item) => item.remaining > 0);
    if (!open.length) {
      return (
        <Panel>
          <h1>Sin servicios disponibles</h1>
          <p>
            Tu plan no tiene servicios libres para añadir. Escribe al equipo de
            Panamá Viajero para ampliarlo.
          </p>
          <Link className="button secondary" href="/panel/servicios">Volver a servicios</Link>
        </Panel>
      );
    }
    if (!preset.categoryId) {
      return (
        <>
          <header className="page-heading">
            <div>
              <h1>¿Qué deseas añadir?</h1>
              <p>Elige el tipo de servicio. Solo aparecen los que tu plan tiene disponibles.</p>
            </div>
            <Link className="button quiet" href="/panel/servicios">Volver a servicios</Link>
          </header>
          <div className="dashboard-grid">
            {open.map((item) => {
              const query = new URLSearchParams({ categoria: item.category_id });
              if (item.hospedaje_type_id) query.set("tipo", item.hospedaje_type_id);
              return (
                <Panel key={`${item.category_id}-${item.hospedaje_type_id ?? ""}`}>
                  <h2>{item.type_label ?? item.category_label}</h2>
                  {item.type_label && <p className="muted">{item.category_label}</p>}
                  <p>Disponibles: <b>{item.remaining}</b> de {item.quantity}</p>
                  <Link className="button primary" href={`/panel/servicios/nuevo?${query}`}>
                    Añadir
                  </Link>
                </Panel>
              );
            })}
          </div>
        </>
      );
    }
    const chosenType = preset.lodgingTypeId ?? "";
    const match = open.find((item) =>
      item.category_id === preset.categoryId &&
      (item.hospedaje_type_id ?? "") === chosenType
    );
    if (!match) redirect("/panel/servicios/nuevo");
    categories = categories.filter((category) => String(category.id) === preset.categoryId);
    lodgingTypes = lodgingTypes.filter((type) => String(type.id) === chosenType);
    presetLodgingTypeId = chosenType;
  }

  const selectedSiteIds = (siteLinks.data ?? []).map((item) => item.tourist_site_id);
  const serviceProvinceId = (service as { destination_province_id?: string | null })
    .destination_province_id;
  const destinationProvinceId =
    serviceProvinceId ??
    (siteResult.data ?? []).find((site) => selectedSiteIds.includes(site.id))?.province_id ??
    "";

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{serviceId ? "Editar servicio" : "Crear servicio"}</h1>
          <p>La ficha se guarda en la base de datos de Panamá Viajero.</p>
        </div>
        <Link className="button quiet" href="/panel/servicios">
          Volver a servicios
        </Link>
      </header>
      <ServiceEditorForm
        role={role}
        service={service as Record<string, unknown>}
        lodging={(lodgingResult.data ?? {}) as Record<string, unknown>}
        restaurant={restaurant as Record<string, unknown>}
        businesses={businesses}
        categories={categories}
        lodgingTypes={lodgingTypes}
        presetLodgingTypeId={presetLodgingTypeId}
        ownerName={ownerName}
        sites={siteResult.data ?? []}
        destinations={(destinationResult.data ?? []).map((row) => ({
          provinceId: row.province_id,
          name: row.name,
        }))}
        destinationProvinceId={destinationProvinceId}
        amenities={amenityResult.data ?? []}
        mealPlans={mealPlanResult.data ?? []}
        restaurantFeatures={featureResult.data ?? []}
        selectedSiteIds={selectedSiteIds}
        selectedAmenityIds={(amenityLinks.data ?? []).map((item) => item.amenity_id)}
        selectedFeatureIds={(featureLinks.data ?? []).map((item) => item.feature_id)}
      />
    </>
  );
}
