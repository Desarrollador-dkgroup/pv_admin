import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { ServiceEditorForm } from "@/components/service-editor-form";
import { getPanelIdentity } from "@/lib/panel-access";
import { canManageCatalog } from "@/types/panel";

// Carga catálogos y relaciones reales antes de mostrar el formulario.
export async function PanelServiceEditor({ serviceId }: { serviceId?: string }) {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "collaborator") redirect("/panel/permisos");
  const businessQuery = supabase
    .from("businesses")
    .select("id, name")
    .order("name");
  const scopedBusinessQuery = canManageCatalog(role)
    ? businessQuery
    : businessQuery.in("id", businessIds);

  const [businessResult, categoryResult, typeResult, siteResult, destinationResult,
    amenityResult, featureResult, serviceResult] =
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
    serviceResult.error
  ) {
    throw new Error("No se pudieron cargar los catálogos de Supabase.");
  }

  const service = serviceResult.data ?? {};
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
        categories={categoryResult.data ?? []}
        lodgingTypes={typeResult.data ?? []}
        sites={siteResult.data ?? []}
        destinations={(destinationResult.data ?? []).map((row) => ({
          provinceId: row.province_id,
          name: row.name,
        }))}
        destinationProvinceId={destinationProvinceId}
        amenities={amenityResult.data ?? []}
        restaurantFeatures={featureResult.data ?? []}
        selectedSiteIds={selectedSiteIds}
        selectedAmenityIds={(amenityLinks.data ?? []).map((item) => item.amenity_id)}
        selectedFeatureIds={(featureLinks.data ?? []).map((item) => item.feature_id)}
      />
    </>
  );
}
