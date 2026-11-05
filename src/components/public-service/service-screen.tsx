import Link from "next/link";
import { IoChevronForward, IoLocationOutline, IoStar } from "react-icons/io5";
import { formatPlace } from "@/lib/public-service/catalog";
import {
  formatGuests,
  formatSlot,
  reservationConfigFor,
  reservationPriceLine,
} from "@/lib/public-service/reservation-config";
import type { ServiceDetail } from "@/lib/public-service/service-detail";
import { BookingBar, ReserveBar } from "./bottom-bars";
import { PhotoGallery } from "./gallery";
import { HeroButtons } from "./hero-buttons";
import { ActivityScreen } from "./activity-screen";
import {
  ContactList,
  FeatureGrid,
  LinkedRestaurants,
  LocationMap,
  LodgingInfo,
  PolicyList,
  ReviewsList,
  RoomList,
  ServiceDetails,
  PromoNotice,
} from "./service-sections";
import styles from "./service.module.css";
import { PriceTag } from "@/components/public-service/price-tag";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function priceLevel(average: number) {
  const level = average <= 15 ? 1 : average <= 24 ? 2 : 3;
  return { symbol: "$".repeat(level), hint: ["económico", "precio medio", "precio alto"][level - 1] };
}

// Ficha de servicio (src/app/service/[id].tsx) y de restaurante (restaurant-ficha.tsx).
export function ServiceScreen({ detail, search }: {
  detail: ServiceDetail;
  search: { checkIn?: string; checkOut?: string; guests?: string };
}) {
  const { item } = detail;

  if (item.categoryId === "actividades" || item.categoryId === "tour-operador") {
    return <ActivityScreen detail={detail} />;
  }
  const query = new URLSearchParams(
    Object.entries(search).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();
  const withQuery = (path: string) => (query ? `${path}?${query}` : path);
  const guests = search.guests ? Number(search.guests) || null : null;
  const restaurant = detail.restaurant;
  const hours = restaurant?.hoursFrom && restaurant.hoursTo
    ? { from: restaurant.hoursFrom, to: restaurant.hoursTo } : null;
  const reservation = reservationConfigFor(item.categoryId, {
    name: item.name,
    schedule: detail.schedule,
    hours,
  });
  const reserveSummary = reservation && guests ? formatGuests(reservation, guests) : undefined;
  const reservePriceLine = reservation
    ? reservationPriceLine(reservation, item.price, guests) : undefined;
  const hasRooms = detail.rooms.length > 0;
  const reserveHref = withQuery(`/servicios/${item.slug}/solicitar`);
  const placeQuery = [detail.address, item.siteName, item.provinceId, "Panamá"]
    .filter(Boolean).join(", ");

  if (item.categoryId === "restaurantes" && restaurant) {
    const level = priceLevel(restaurant.averagePriceMin ?? item.price);
    const menuPhoto = detail.photos[1] ?? detail.photos[0] ?? null;
    return (
      <div className={styles.screen}>
        <div className={styles.heroWrap}>
          <PhotoGallery photos={detail.photos} indicator="counter" className={styles.heroTall} />
          <HeroButtons serviceId={item.id} />
        </div>
        <div className={`${styles.layout} ${styles.sheetRounded}`}>
          <div className={styles.sheet}>
            <div className={styles.titleRow}>
              <h1 className={styles.name}>{item.name}</h1>
              <span className={styles.pricePill} title={`Nivel de precios ${level.hint}`}>
                {level.symbol}
              </span>
            </div>
            <p className={styles.locationRow}>
              <IoLocationOutline size={16} color="var(--text-muted)" aria-hidden />
              {formatPlace(item)}
            </p>
            {restaurant.tag && <span className={styles.tag}>{restaurant.tag}</span>}
            {item.description && <p className={styles.description}>{item.description}</p>}
            {restaurant.paymentMethods.length > 0 && (
              <p className={styles.payment}>
                Métodos de pago: <strong>{restaurant.paymentMethods.join(" · ")}</strong>
              </p>
            )}
            <div className={styles.metaRow}>
              <span className={styles.ratingRow}>
                <IoStar size={15} color="var(--star)" aria-hidden />
                <span className={styles.ratingText}>{item.rating.toFixed(1)}</span>
              </span>
              <span className={styles.infoPill}>{level.symbol} {level.hint}</span>
            </div>

            <div className={styles.band} />
            <FeatureGrid title="Contamos para tu experiencia" items={restaurant.features} tiled />

            {restaurant.menuUrl && (
              <>
                <div className={styles.band} />
                <section className={styles.section}>
                  <h2 className={styles.headingLarge}>Carta</h2>
                  <Link
                    href={restaurant.menuUrl}
                    className={styles.menuCard}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {menuPhoto
                      ? <img src={menuPhoto} alt="" className={styles.menuThumb} />
                      : <span className={styles.menuThumb} />}
                    <span className={styles.menuLabel}>Ver menú</span>
                    <IoChevronForward size={22} color="var(--text-strong)" aria-hidden />
                  </Link>
                </section>
              </>
            )}

            {restaurant.hours.length > 0 && (
              <>
                <div className={styles.band} />
                <PolicyList
                  title="Horario"
                  items={restaurant.hours.map((slot) =>
                    [DAYS[slot.day] ?? "", `${formatSlot(slot.opens)} a ${formatSlot(slot.closes)}`])}
                />
              </>
            )}

            <PolicyList title="Sobre el restaurante" items={[
              ["Cocina", restaurant.cuisineType],
              ["Estilo de servicio", restaurant.serviceStyle],
              ["Ambiente", restaurant.ambience],
              ["Reservas", restaurant.reservationPolicy],
              ["Cancelación", restaurant.cancellationPolicy],
            ]} />
            <ContactList items={[
              ["Teléfono", restaurant.contactPhone,
                restaurant.contactPhone && `tel:${restaurant.contactPhone}`],
              ["Correo", restaurant.contactEmail,
                restaurant.contactEmail && `mailto:${restaurant.contactEmail}`],
              ["Sitio web", restaurant.websiteUrl, restaurant.websiteUrl],
            ]} />

            <div className={styles.band} />
            <LocationMap embedUrl={detail.mapsEmbedUrl} address={detail.address} query={placeQuery} />

            {detail.reviews.length > 0 && (
              <>
                <div className={styles.band} />
                <ReviewsList reviews={detail.reviews} />
              </>
            )}
          </div>
          {reservation && restaurant.acceptsReservations && (
            <aside className={styles.barSlot}>
              <ReserveBar href={reserveHref} summary={reserveSummary} priceLine={reservePriceLine}
                label="Reservar mesa" />
            </aside>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.heroWrap}>
        <PhotoGallery photos={detail.photos} className={styles.hero} />
        <HeroButtons serviceId={item.id} />
      </div>
      <div className={styles.layout}>
        <div className={styles.sheet}>
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{item.name}</h1>
            <span className={styles.pricePill}>
              <PriceTag price={item.price} promoPrice={item.promoPrice} />
            </span>
          </div>
          <p className={styles.locationRow}>
            <IoLocationOutline size={16} color="var(--text-muted)" aria-hidden />
            {formatPlace(item)}
          </p>
          <div className={styles.metaRow}>
            <span className={styles.ratingRow}>
              <IoStar size={15} color="var(--star)" aria-hidden />
              <span className={styles.ratingText}>{item.rating.toFixed(1)}</span>
            </span>
            {item.ratingCount > 0 && (
              <span className={styles.infoPill}>
                {item.ratingCount} {item.ratingCount === 1 ? "reseña" : "reseñas"}
              </span>
            )}
            {item.hospedajeTypeLabel && (
              <span className={styles.infoPill}>{item.hospedajeTypeLabel}</span>
            )}
          </div>

          {item.description && (
            <>
              <div className={styles.divider} />
              <p className={styles.description}>{item.description}</p>
            </>
          )}

          {!hasRooms && (
            <>
              <div className={styles.divider} />
              <ServiceDetails detail={detail} />
            </>
          )}

          {detail.amenities.length > 0 && (
            <>
              <div className={styles.divider} />
              <FeatureGrid title="Contamos para tu experiencia" items={detail.amenities} />
            </>
          )}

          {detail.lodging && (
            <>
              <div className={styles.divider} />
              <LodgingInfo detail={detail} />
            </>
          )}

          <div className={styles.divider} />
          <LocationMap embedUrl={detail.mapsEmbedUrl} address={detail.address} query={placeQuery} />

          <PromoNotice promotions={detail.promotions.filter((promo) => !promo.roomId)} />

          {hasRooms && (
            <>
              <div className={styles.divider} />
              <RoomList
                rooms={detail.rooms}
                promotions={detail.promotions}
                hrefFor={(room) => withQuery(`/servicios/${item.slug}/habitaciones/${room.slug}`)}
              />
            </>
          )}

          {detail.linkedRestaurants.length > 0 && (
            <>
              <div className={styles.divider} />
              <LinkedRestaurants restaurants={detail.linkedRestaurants} />
            </>
          )}

          {detail.reviews.length > 0 && (
            <>
              <div className={styles.divider} />
              <ReviewsList reviews={detail.reviews} />
            </>
          )}
        </div>

        {reservation && (
          <aside className={styles.barSlot}>
            <ReserveBar href={reserveHref} summary={reserveSummary} priceLine={reservePriceLine} />
          </aside>
        )}
        {hasRooms && (
          <aside className={styles.barSlot}>
            <BookingBar
              href={withQuery(`/servicios/${item.slug}/reservar`)}
              priceLine={`Desde $${item.price} / noche`}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
