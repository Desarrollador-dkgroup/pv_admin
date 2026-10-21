import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { loadOwnerPlanUsage } from "@/lib/panel-service-plan";
import { REVIEW_STATUS, SERVICE_STATUS, ownerStateOf, statusOf } from "@/lib/panel-labels";
import { publishOwnServiceAction } from "@/app/panel/actions";
import { related } from "@/lib/panel-relations";
import { canManageCatalog } from "@/types/panel";
import { PrepareDraftServiceButton } from "@/components/prepare-draft-service-button";

// Lista servicios de Supabase dentro del alcance del equipo o del propietario.
export default async function ServicesPage() {
  const { supabase, role, businessIds } = await getPanelIdentity();
  if (role === "collaborator") redirect("/panel");
  const isStaff = canManageCatalog(role);

  // Sin negocio asignado, el propietario no tiene servicios que consultar.
  if (!isStaff && !businessIds.length) {
    return (
      <Panel>
        <h1>Mis servicios</h1>
        <p role="alert">La cuenta no tiene un negocio asignado.</p>
      </Panel>
    );
  }

  const planUsage = !isStaff
    ? await Promise.all(businessIds.map(async (businessId) => ({
      businessId,
      slots: await loadOwnerPlanUsage(supabase, businessId),
    })))
    : [];
  let query = supabase
    .from("services")
    .select("id, name, status, review_status, category_id, businesses(name)")
    .order("updated_at", { ascending: false });
  if (!isStaff) query = query.in("business_id", businessIds);

  const [{ data, error }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, label").order("sort_order"),
  ]);
  if (error) throw new Error("No se pudo consultar la lista de servicios.");

  const categoryLabels = new Map((categories ?? []).map((item) => [item.id, item.label]));

  if (!isStaff) {
    const openSlots = planUsage.flatMap(({ businessId, slots }) => slots
      .filter((slot) => slot.remaining > 0)
      .map((slot) => ({ businessId, slot })));
    return (
      <>
        <header className="page-heading">
          <div>
            <h1>Mis fichas</h1>
            <p>Completa tus servicios y consulta la vista previa cuando guardes cambios.</p>
          </div>
        </header>
        <div className="merchant-listing-grid">
          {(data ?? []).map((service) => {
            const state = ownerStateOf(service);
            const href = service.category_id === "hospedaje"
              ? `/panel/servicios/${service.id}/portada`
              : `/panel/servicios/${service.id}`;
            return (
              <Panel className="merchant-listing-card" key={service.id}>
                <span className="merchant-listing-type">
                  {categoryLabels.get(service.category_id) ?? service.category_id}
                </span>
                <h2>{service.name}</h2>
                <Badge tone={state.tone}>{state.label}</Badge>
                <div className="actions merchant-listing-actions">
                  <Link className="button primary" href={href}>Editar ficha</Link>
                  <Link className="button secondary" href={`/panel/servicios/${service.id}/vista-previa`}>
                    Vista previa
                  </Link>
                  {service.review_status === "approved" && service.status !== "published" && (
                    <form action={publishOwnServiceAction}>
                      <input type="hidden" name="service_id" value={service.id} />
                      <button className="button secondary" type="submit">Publicar</button>
                    </form>
                  )}
                </div>
              </Panel>
            );
          })}
          {openSlots.flatMap(({ businessId, slot }) =>
            Array.from({ length: slot.remaining }, (_, index) => (
              <Panel className="merchant-listing-card"
                key={`${businessId}-${slot.category_id}-${slot.hospedaje_type_id ?? "none"}-${index}`}>
                <span className="merchant-listing-type">{slot.category_label}</span>
                <h2>{slot.type_label ?? slot.category_label} por preparar</h2>
                <p className="muted">Empieza a añadir información y fotos de este servicio.</p>
                <PrepareDraftServiceButton
                  businessId={businessId}
                  categoryId={slot.category_id}
                  hospedajeTypeId={slot.hospedaje_type_id}
                  label="Comenzar ficha"
                />
              </Panel>
            ))) }
        </div>
        {!data?.length && !openSlots.length && <Panel>
          <p>Aún no hay servicios asignados. Contacta con el equipo de Panamá Viajero.</p>
        </Panel>}
      </>
    );
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{isStaff ? "Servicios" : "Mis servicios"}</h1>
          <p>Los cambios se guardan en la base de datos compartida.</p>
        </div>
        <Link href="/panel/servicios/nuevo" className="button primary">
          + Crear servicio
        </Link>
      </header>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Servicio</th>
                <th>Tipo</th>
                <th>Negocio</th>
                <th>Estado</th>
                <th>Revisión</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((service) => {
                const status = statusOf(SERVICE_STATUS, service.status);
                const review = statusOf(REVIEW_STATUS, service.review_status);
                return (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>{categoryLabels.get(service.category_id) ?? service.category_id}</td>
                    <td>{related(service.businesses)?.name ?? "—"}</td>
                    <td><Badge tone={status.tone}>{status.label}</Badge></td>
                    <td><Badge tone={review.tone}>{review.label}</Badge></td>
                    <td>
                      <Link className="button secondary" href={`/panel/servicios/${service.id}`}>
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!data?.length && <p className="muted">No hay servicios disponibles para mostrar.</p>}
      </Panel>
    </>
  );
}
