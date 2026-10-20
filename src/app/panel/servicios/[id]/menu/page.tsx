import Link from "next/link";
import { notFound } from "next/navigation";
import {
  RestaurantMenuManager,
  type Dish,
  type MenuSection,
} from "@/components/restaurant-menu-manager";
import { getPanelIdentity } from "@/lib/panel-access";

// Carga platos y secciones reales para un servicio de restaurante.
export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name, category_id, business_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !service || service.category_id !== "restaurantes" ||
    role === "collaborator" ||
    (role === "propietario" && !businessIds.includes(service.business_id))) notFound();

  const { data: sectionRows, error: sectionError } = await supabase
    .from("menu_sections")
    .select("id, title, position")
    .eq("service_id", id)
    .order("position");
  if (sectionError) throw new Error("No se pudieron cargar las secciones del menú.");

  const sections = sectionRows ?? [];
  const dishRows = sections.length
    ? await supabase
        .from("menu_dishes")
        .select(
          "id, section_id, name, description, price_cents, position, " +
          "is_available, ingredients, allergens, dietary_tags",
        )
        .in("section_id", sections.map((section) => section.id))
        .order("position")
    : { data: [], error: null };
  if (dishRows.error) throw new Error("No se pudieron cargar los platos del menú.");

  const dishes = (dishRows.data ?? []) as unknown as Dish[];
  const grouped: MenuSection[] = sections.map((section) => ({
    ...section,
    dishes: dishes.filter((dish) => dish.section_id === section.id),
  }));

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Menú de {service.name}</h1>
          <p>Administra nombres, precios e información alimentaria del menú.</p>
        </div>
        <Link className="button quiet" href={`/panel/servicios/${id}`}>
          Volver al servicio
        </Link>
      </header>
      <RestaurantMenuManager serviceId={id} initialSections={grouped} />
    </>
  );
}
