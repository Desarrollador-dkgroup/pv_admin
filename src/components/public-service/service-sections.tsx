import Link from "next/link";
import { formatPrice } from "@/lib/public-service/money";
import type { IconType } from "react-icons";
import {
  IoCalendarOutline,
  IoCashOutline,
  IoChevronForward,
  IoCompassOutline,
  IoLocationOutline,
  IoNavigateOutline,
  IoPricetagOutline,
  IoStar,
  IoTimeOutline,
} from "react-icons/io5";
import { IonIcon } from "@/components/public-service/ion-icon";
import { CoverPhoto, PhotoPlaceholder } from "@/components/public-service/ui";
import { formatSlot, PRICE_MEANING } from "@/lib/public-service/reservation-config";
import type {
  ActivityAttraction,
  Feature,
  LinkedRestaurant,
  Review,
  Room,
  ServiceDetail,
} from "@/lib/public-service/service-detail";
import { formatPlace } from "@/lib/public-service/catalog";
import type { ServicePromotion } from "@/lib/public-service/service-promotions";
import styles from "./service.module.css";
import { PriceTag } from "@/components/public-service/price-tag";

// Secciones de la ficha (src/components/service-detail/*), con los datos del panel.

export type DetailRow = { icon: IconType; label: string; value: string };

export function DetailRows({ title, rows }: { title: string; rows: DetailRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      {rows.map(({ icon: Icon, label, value }) => (
        <div key={label} className={styles.detailRow}>
          <Icon size={18} color="var(--indigo)" aria-hidden />
          <div className={styles.detailText}>
            <span className={styles.detailLabel}>{label}</span>
            <span className={styles.detailValue}>{value}</span>
          </div>
        </div>
      ))}
    </section>
  );
}

export function ServiceDetails({ detail }: { detail: ServiceDetail }) {
  const { item } = detail;
  const rows: DetailRow[] = [
    { icon: IoPricetagOutline, label: "Categoría", value: detail.categoryLabel },
    { icon: IoLocationOutline, label: "Ubicación", value: formatPlace(item) },
    ...(item.siteName
      ? [{ icon: IoCompassOutline, label: "Sitio turístico", value: item.siteName }] : []),
    ...(detail.schedule.length > 0
      ? [{ icon: IoTimeOutline, label: "Salidas",
        value: detail.schedule.map(formatSlot).join(" · ") }] : []),
    { icon: IoCashOutline, label: PRICE_MEANING[item.categoryId] ?? "Precio desde",
      value: formatPrice(item.price) },
  ];
  return <DetailRows title="Detalles" rows={rows} />;
}

export function FeatureGrid({ title, items, tiled = false }: {
  title: string;
  items: Feature[];
  tiled?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.featureGrid}>
        {items.map((feature) => (
          <div key={feature.id} className={styles.featureTile}>
            {tiled ? (
              <span className={styles.featureBox}>
                <IonIcon name={feature.icon} size={26} />
              </span>
            ) : (
              <IonIcon name={feature.icon} size={22} />
            )}
            <span className={styles.featureLabel}>{feature.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function LocationMap({ embedUrl, address, query }: {
  embedUrl: string | null;
  address: string | null;
  query: string;
}) {
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <section className={styles.sectionTight}>
      <h2 className={styles.heading}>Ubicación</h2>
      <iframe
        title="Mapa"
        src={embedUrl ?? `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
        className={styles.mapCard}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {address && (
        <p className={styles.approxNote}>
          <IoLocationOutline size={14} color="#6B6B6B" aria-hidden /> {address}
        </p>
      )}
      <a href={mapsLink} target="_blank" rel="noreferrer" className={styles.mapsButton}>
        <IoNavigateOutline size={16} color="var(--indigo)" aria-hidden />
        Abrir en Google Maps
      </a>
    </section>
  );
}

export function roomCapacityLabel(room: Room) {
  return [`Máx. ${room.capacity} ${room.capacity === 1 ? "persona" : "personas"}`, room.beds]
    .filter(Boolean).join(" · ");
}

export function PromoNotice({ promotions }: { promotions: ServicePromotion[] }) {
  if (promotions.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Promociones</h2>
      {promotions.map((promo) => (
        <div key={promo.id} className={styles.promoBlock}>
          <b className={styles.promoTitle}>{promo.title}</b>
          <span className={styles.infoItem}>Descuento: -{promo.discountPct}%</span>
          {!promo.active && <span className={styles.infoItem}>Próximamente</span>}
          {promo.active && promo.regularCents !== null && promo.finalCents !== null && (
            <div className={styles.infoItem}>
              Precio: <PriceTag price={promo.regularCents / 100} promoPrice={promo.finalCents / 100} />
            </div>
          )}
          <span className={styles.infoItem}>{promo.scheduleLabel}</span>
        </div>
      ))}
    </section>
  );
}

export function RoomList({ rooms, hrefFor, promotions = [] }: {
  rooms: Room[];
  hrefFor: (room: Room) => string;
  promotions?: ServicePromotion[];
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Habitaciones</h2>
      <div className={styles.roomList}>
        {rooms.map((room) => (
          <Link key={room.id} href={hrefFor(room)} className={styles.roomCard}>
            <span className={styles.roomThumb}>
              {room.photos[0] ? <CoverPhoto src={room.photos[0]} />
                : <PhotoPlaceholder className={styles.fill} />}
            </span>
            <span className={styles.roomInfo}>
              <span className={styles.roomName}>{room.name}</span>
              <span className={styles.roomCapacity}>{roomCapacityLabel(room)}</span>
              {room.description && (
                <span className={styles.roomDescription}>{room.description}</span>
              )}
              <span className={styles.roomPrice}>
                {(() => {
                  const promo = promotions.find((item) => item.roomId === room.id && item.active);
                  return (
                    <>
                      <PriceTag price={room.price} promoPrice={promo?.finalCents != null
                        ? promo.finalCents / 100 : null} />{" "}
                      <small>/ noche</small>
                    </>
                  );
                })()}
              </span>
            </span>
            <IoChevronForward size={18} color="var(--text-muted)" aria-hidden />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function AttractionList({ attractions, hrefFor, heading = "Atracciones" }: {
  attractions: ActivityAttraction[];
  hrefFor: (attraction: ActivityAttraction, idx: number) => string;
  heading?: string;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{heading}</h2>
      <div className={styles.roomList}>
        {attractions.map((attraction, idx) => {
          const cover = attraction.photos?.find((photo) => photo.storage_path)?.storage_path;
          return (
            <Link key={attraction.id ?? idx} href={hrefFor(attraction, idx)}
              className={styles.roomCard}>
              <span className={styles.roomThumb}>
                {cover ? <CoverPhoto src={cover} /> : <PhotoPlaceholder className={styles.fill} />}
              </span>
              <span className={styles.roomInfo}>
                <span className={styles.roomName}>{attraction.name}</span>
                {attraction.options.length > 0 && (
                  <span className={styles.roomCapacity}>{attraction.options.join(" · ")}</span>
                )}
                {attraction.description && (
                  <span className={styles.roomDescription}>{attraction.description}</span>
                )}
              </span>
              <IoChevronForward size={18} color="var(--text-muted)" aria-hidden />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function LinkedRestaurants({ restaurants }: { restaurants: LinkedRestaurant[] }) {
  if (restaurants.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Restaurantes del hospedaje</h2>
      <div className={`${styles.linkedRow} no-scrollbar`}>
        {restaurants.map((restaurant) => (
          <Link key={restaurant.id} href={`/servicios/${restaurant.slug}`}
            className={styles.linkedCard}>
            <span className={styles.linkedPhoto}><CoverPhoto src={restaurant.photo} /></span>
            <span className={styles.linkedName}>{restaurant.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Comentarios</h2>
      <div className={styles.reviewList}>
        {reviews.map((review) => (
          <div key={review.id} className={styles.reviewCard}>
            <div className={styles.reviewHeader}>
              <span className={styles.reviewAuthor}>{review.author}</span>
              <span className={styles.ratingRow}>
                <IoStar size={13} color="var(--star)" aria-hidden />
                <span className={styles.reviewRating}>{review.rating.toFixed(1)}</span>
              </span>
            </div>
            {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

// Información del hospedaje que guarda el panel (lodging_profiles).
export function LodgingInfo({ detail }: { detail: ServiceDetail }) {
  const lodging = detail.lodging;
  if (!lodging) return null;
  const checkIn = [lodging.check_in_from, lodging.check_in_to].filter(Boolean).join(" a ");
  const rows: DetailRow[] = [
    ...(checkIn ? [{ icon: IoCalendarOutline, label: "Check-in", value: checkIn }] : []),
    ...(lodging.check_out_time
      ? [{ icon: IoCalendarOutline, label: "Check-out", value: lodging.check_out_time }] : []),
    ...(lodging.reception_hours
      ? [{ icon: IoTimeOutline, label: "Recepción", value: lodging.reception_hours }] : []),
    ...(detail.mealPlanLabel
      ? [{ icon: IoPricetagOutline, label: "Plan de comidas", value: detail.mealPlanLabel }] : []),
    ...(lodging.languages
      ? [{ icon: IoCompassOutline, label: "Idiomas", value: lodging.languages }] : []),
  ];
  const policies: [string, string | null][] = [
    ["Cómo llegar", lodging.arrival_instructions ?? lodging.arrival_method],
    ["Estacionamiento", lodging.parking_details],
    ["Wi-Fi", lodging.wifi_details],
    ["Accesibilidad", lodging.accessibility_details],
    ["Normas de la casa", lodging.guest_rules],
    ["Mascotas", lodging.pet_policy],
    ["Fumar", lodging.smoking_policy],
    ["Eventos", lodging.events_policy],
    ["Cancelación", lodging.cancellation_policy],
  ];
  const contact: [string, string | null, string | null][] = [
    ["Teléfono", lodging.contact_phone, lodging.contact_phone && `tel:${lodging.contact_phone}`],
    ["Correo", lodging.contact_email, lodging.contact_email && `mailto:${lodging.contact_email}`],
    ["Sitio web", lodging.website_url, lodging.website_url],
  ];
  return (
    <>
      <DetailRows title="Tu estadía" rows={rows} />
      <PolicyList title="Normas y servicios" items={policies} />
      <ContactList items={contact} />
    </>
  );
}

export function PolicyList({ title, items }: { title: string; items: [string, string | null][] }) {
  const visible = items.filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (visible.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <dl className={styles.policyList}>
        {visible.map(([label, value]) => (
          <div key={label} className={styles.policyItem}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function ContactList({ items }: { items: [string, string | null, string | null][] }) {
  const visible = items.filter((entry) => Boolean(entry[1]));
  if (visible.length === 0) return null;
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Contacto</h2>
      <div className={styles.contactRow}>
        {visible.map(([label, value, href]) => (
          <a key={label} href={href ?? undefined} target={label === "Sitio web" ? "_blank" : undefined}
            rel="noreferrer" className={styles.contactChip}>
            <span className={styles.detailLabel}>{label}</span>
            <span className={styles.contactValue}>{value}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
