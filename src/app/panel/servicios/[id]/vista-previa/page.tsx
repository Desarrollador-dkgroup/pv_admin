import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";
import { formatCents } from "@/lib/panel-format";
import { ownerStateOf } from "@/lib/panel-labels";

// Una vista privada del contenido guardado. No publica borradores ni permite reservas.
export default async function ServicePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, business_id, category_id, name, address, search_description, description, status, review_status, base_price_cents")
    .eq("id", id)
    .maybeSingle();
  // El colaborador la usa para revisar fichas; el propietario solo ve las suyas.
  if (error || !service ||
    (role === "propietario" && !businessIds.includes(service.business_id))) notFound();

  const [category, photos, amenityLinks, rooms, sections, restaurant] = await Promise.all([
    supabase.from("categories").select("label").eq("id", service.category_id).maybeSingle(),
    supabase.from("service_photos")
      .select("storage_path, is_cover, position")
      .eq("service_id", id).is("lodging_area_id", null).order("position"),
    supabase.from("service_amenities").select("amenity_id").eq("service_id", id),
    service.category_id === "hospedaje"
      ? supabase.from("room_types")
        .select("id, name, description, capacity, beds_label, price_cents")
        .eq("service_id", id).order("position")
      : Promise.resolve({ data: [], error: null }),
    service.category_id === "restaurantes"
      ? supabase.from("menu_sections").select("id, title").eq("service_id", id).order("position")
      : Promise.resolve({ data: [], error: null }),
    service.category_id === "restaurantes"
      ? supabase.from("restaurant_profiles").select("cuisine_type, ambience").eq("service_id", id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (category.error || photos.error || amenityLinks.error || rooms.error ||
    sections.error || restaurant.error) {
    throw new Error("No se pudo cargar la vista previa de esta ficha.");
  }

  const amenityIds = (amenityLinks.data ?? []).map((item) => item.amenity_id);
  const roomIds = (rooms.data ?? []).map((room) => room.id);
  const sectionIds = (sections.data ?? []).map((section) => section.id);
  const [amenities, roomPhotos, dishes] = await Promise.all([
    amenityIds.length
      ? supabase.from("amenities").select("id, label").in("id", amenityIds)
      : Promise.resolve({ data: [], error: null }),
    roomIds.length
      ? supabase.from("room_type_photos")
        .select("room_type_id, storage_path, is_cover, position").in("room_type_id", roomIds).order("position")
      : Promise.resolve({ data: [], error: null }),
    sectionIds.length
      ? supabase.from("menu_dishes")
        .select("section_id, name, description, price_cents, is_available")
        .in("section_id", sectionIds).order("position")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (amenities.error || roomPhotos.error || dishes.error) {
    throw new Error("No se pudieron cargar los detalles de la vista previa.");
  }

  const photo = [...(photos.data ?? [])].sort((a, b) =>
    Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)[0];
  const mediaUrl = (path: string) =>
    supabase.storage.from("service-media").getPublicUrl(path).data.publicUrl;
  const state = ownerStateOf(service);
  const editHref = service.category_id === "hospedaje"
    ? `/panel/servicios/${id}/portada` : `/panel/servicios/${id}`;

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Vista previa de tu ficha</h1>
          <p>Solo tú y el equipo pueden ver esta pantalla mientras trabajas.</p>
        </div>
        <Link className="button secondary" href={editHref}>Volver a editar</Link>
      </header>
      <div className="merchant-preview-callout">
        <div>
          <strong>Contenido guardado · {state.label}</strong>
          <p>Se actualiza después de guardar cambios o subir fotos. La presentación final en la app y la web puede variar.</p>
        </div>
        <Link className="button secondary" href={`/panel/servicios/${id}/galeria`}>Administrar fotos</Link>
      </div>
      <div className="merchant-preview-wrap">
        <div className="merchant-preview-phone" aria-label="Vista previa para viajeros">
          <div className="merchant-preview-photo">
            {photo ? (
              <Image src={mediaUrl(photo.storage_path)} alt={`Portada de ${service.name}`}
                fill unoptimized sizes="(max-width: 560px) 100vw, 390px" />
            ) : (
              <div className="merchant-preview-empty">Aún no hay una foto de portada</div>
            )}
          </div>
          <div className="merchant-preview-content">
            <span className="merchant-preview-kicker">{category.data?.label ?? service.category_id}</span>
            <h2>{service.name || "Tu servicio sin nombre"}</h2>
            {service.address && <p className="merchant-preview-location">{service.address}</p>}
            {service.search_description && <p className="merchant-preview-lead">{service.search_description}</p>}
            {service.description && <p className="merchant-preview-description">{service.description}</p>}
            {amenities.data?.length ? (
              <section className="merchant-preview-section">
                <h3>Servicios y comodidades</h3>
                <div className="merchant-preview-tags">{amenities.data.map((item) =>
                  <span key={item.id}>{item.label}</span>)}</div>
              </section>
            ) : null}
            {service.category_id === "restaurantes" && (
              <>
                {restaurant.data?.cuisine_type &&
                  <p className="merchant-preview-lead">Cocina: {restaurant.data.cuisine_type}</p>}
                {restaurant.data?.ambience && <p>{restaurant.data.ambience}</p>}
                {(sections.data ?? []).map((section) => (
                  <section key={section.id} className="merchant-preview-section">
                    <h3>{section.title}</h3>
                    {(dishes.data ?? []).filter((dish) => dish.section_id === section.id).map((dish, index) => (
                      <div className="merchant-preview-menu-row" key={`${section.id}-${index}`}>
                        <div><b>{dish.name}</b>{dish.description && <p>{dish.description}</p>}
                          {!dish.is_available && <small>Agotado</small>}</div>
                        <strong>{formatCents(dish.price_cents)}</strong>
                      </div>
                    ))}
                  </section>
                ))}
              </>
            )}
            {service.category_id === "hospedaje" && (
              <section className="merchant-preview-section">
                <h3>Habitaciones</h3>
                {(rooms.data ?? []).length ? (rooms.data ?? []).map((room) => {
                  const roomPhoto = [...(roomPhotos.data ?? [])]
                    .filter((item) => item.room_type_id === room.id)
                    .sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position)[0];
                  return (
                    <div className="merchant-preview-room" key={room.id}>
                      {roomPhoto && <div className="merchant-preview-room-photo">
                        <Image src={mediaUrl(roomPhoto.storage_path)} alt={room.name}
                          fill unoptimized sizes="(max-width: 560px) 100vw, 360px" />
                      </div>}
                      <div className="merchant-preview-room-copy">
                        <strong>{room.name}</strong>
                        {room.description && <p>{room.description}</p>}
                        <small>{[room.capacity && `Hasta ${room.capacity} personas`, room.beds_label]
                          .filter(Boolean).join(" · ")}</small>
                        {room.price_cents != null && <b>Desde {formatCents(room.price_cents)} / noche</b>}
                      </div>
                    </div>
                  );
                }) : <p className="muted">Todavía no has agregado habitaciones.</p>}
              </section>
            )}
            {service.category_id !== "hospedaje" && service.base_price_cents != null &&
              <p className="merchant-preview-price">Desde {formatCents(service.base_price_cents)}</p>}
            {!photo && !service.search_description && !service.description &&
              <p className="muted">Agrega fotos y una descripción para completar esta vista.</p>}
          </div>
        </div>
        <aside className="merchant-preview-aside">
          <h2>Sigue completando tu ficha</h2>
          <p>Esta vista utiliza solamente la información guardada; no crea reservas ni muestra el borrador al público.</p>
          <div className="actions">
            <Link className="button primary" href={editHref}>Editar información</Link>
            <Link className="button secondary" href={`/panel/servicios/${id}/galeria`}>Agregar imágenes</Link>
            {service.category_id === "hospedaje" &&
              <Link className="button secondary" href={`/panel/servicios/${id}/unidades`}>Habitaciones y tarifas</Link>}
            {service.category_id === "restaurantes" &&
              <Link className="button secondary" href={`/panel/servicios/${id}/menu`}>Editar menú</Link>}
          </div>
          <Badge tone={state.tone}>{state.label}</Badge>
        </aside>
      </div>
    </>
  );
}
