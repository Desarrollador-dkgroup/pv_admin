import { IoLocationOutline, IoNavigateOutline } from "react-icons/io5";
import type { ServiceDetail } from "@/lib/public-service/service-detail";
import { formatPlace } from "@/lib/public-service/catalog";
import { PhotoGallery } from "./gallery";
import { HeroButtons } from "./hero-buttons";
import {
  AttractionList,
  LocationMap,
  PromoNotice,
  ReviewsList,
} from "./service-sections";
import { ReserveBar } from "./bottom-bars";
import styles from "./service.module.css";
import { PriceTag } from "@/components/public-service/price-tag";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function formatTime12(time: string) {
  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "pm" : "am";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === "00" ? `${hour12} ${suffix}` : `${hour12}:${minute} ${suffix}`;
}

function getActivityStatus(hours: { day: number; opens: string; closes: string }[]) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const todayHours = hours.filter((h) => h.day === dayOfWeek);
  if (todayHours.length === 0) {
    return { status: "Cerrado", closesAt: null };
  }

  let isOpen = false;
  let closesAt = "";

  for (const hour of todayHours) {
    if (timeStr >= hour.opens && timeStr < hour.closes) {
      isOpen = true;
      closesAt = hour.closes;
      break;
    }
  }

  if (isOpen) {
    const [closeHours, closeMinutes] = closesAt.split(":").map(Number);
    const closeTime = closeHours * 60 + closeMinutes;
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const minutesUntilClose = closeTime - currentTime;

    if (minutesUntilClose <= 60) {
      return { status: `Pronto a cerrar (${closesAt})`, closesAt };
    }
    return { status: "Abierto", closesAt };
  }

  return { status: "Cerrado", closesAt: null };
}

function formatDeparture(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return time ? `${label} · ${formatTime12(time)}` : label;
}

export function ActivityScreen({ detail }: { detail: ServiceDetail }) {
  const { item, activity } = detail;

  if (!activity) {
    return <div>Actividad no disponible</div>;
  }

  const activityStatus = getActivityStatus(activity.hours);
  const placeQuery = [detail.address, item.siteName, item.provinceId, "Panamá"]
    .filter(Boolean).join(", ");
  const reserveHref = `/servicios/${item.slug}/solicitar`;
  const tour = activity.tour;
  const isTour = tour !== null;

  return (
    <div className={styles.screen}>
      <div className={styles.heroWrap}>
        <PhotoGallery photos={detail.photos} className={styles.hero} />
        <HeroButtons serviceId={item.id} />
      </div>
      <div className={`${styles.layout} ${styles.sheetRounded}`}>
        <div className={styles.sheet}>
          <div className={styles.titleRow}>
            <h1 className={styles.name}>{item.name}</h1>
            {isTour && (
              <span className={styles.pricePill}>
                <PriceTag price={item.price} promoPrice={item.promoPrice} />/persona
              </span>
            )}
          </div>
          <p className={styles.locationRow}>
            <IoLocationOutline size={16} color="var(--text-muted)" aria-hidden />
            {formatPlace(item)}
          </p>

          {item.description && (
            <>
              <div className={styles.divider} />
              <p className={styles.description}>{item.description}</p>
            </>
          )}

          <PromoNotice promotions={detail.promotions} />

          {tour && (
            <>
              <div className={styles.divider} />
              <section className={styles.section}>
                <h2 className={styles.heading}>Detalles del tour</h2>
                {tour.duration && (
                  <p className={styles.infoItem}><strong>Duración:</strong> {tour.duration}</p>
                )}
                {tour.language && (
                  <p className={styles.infoItem}><strong>Idioma del guía:</strong> {tour.language}</p>
                )}
                {tour.maxGroupSize && (
                  <p className={styles.infoItem}>
                    <strong>Cupo máximo por salida:</strong> {tour.maxGroupSize} personas
                  </p>
                )}
              </section>
              {(tour.meetingPointLabel || tour.meetingPointUrl) && (
                <section className={styles.section}>
                  <h2 className={styles.heading}>Punto de encuentro</h2>
                  {tour.meetingPointLabel && (
                    <p className={styles.infoItem}>{tour.meetingPointLabel}</p>
                  )}
                  {tour.meetingPointUrl && (
                    <a href={tour.meetingPointUrl} target="_blank" rel="noreferrer"
                      className={styles.mapsButton}>
                      <IoNavigateOutline size={16} color="var(--indigo)" aria-hidden />
                      Abrir punto de encuentro en Google Maps
                    </a>
                  )}
                </section>
              )}
              {tour.departureMode !== "weekly" && tour.departures.length > 0 && (
                <section className={styles.section}>
                  <h2 className={styles.heading}>Fechas de salida</h2>
                  {tour.departures.map((departure, idx) => (
                    <p key={idx} className={styles.infoItem}>
                      {formatDeparture(departure.date, departure.time)}
                    </p>
                  ))}
                </section>
              )}
            </>
          )}

          {activity.hours.length > 0 && (
            <>
              <div className={styles.divider} />
              <section className={styles.section}>
                <h2 className={styles.headingLarge}>
                  {isTour ? "Horario semanal de salidas" : "Horario semanal"}
                </h2>
                <p className={styles.statusBadge} style={{
                  color: activityStatus.status === "Abierto" ? "var(--success)" :
                         activityStatus.status.startsWith("Pronto a cerrar") ? "var(--warning)" :
                         "var(--text-muted)",
                }}>
                  {activityStatus.status}
                </p>
                <div className={styles.scheduleGrid}>
                  {DAYS.map((day, idx) => {
                    const daySchedule = activity.schedule[day.toLowerCase()];
                    if (!daySchedule || !daySchedule.start) return null;
                    return (
                      <div key={idx} className={styles.scheduleItem}>
                        <strong>{day}</strong>
                        <span>{formatTime12(daySchedule.start)} a {formatTime12(daySchedule.end)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {activity.minAge && (
            <>
              <div className={styles.divider} />
              <p className={styles.infoItem}>
                <strong>Edad recomendada:</strong> Desde los {activity.minAge} años
              </p>
            </>
          )}

          {activity.whatIncludes.length > 0 && (
            <>
              <div className={styles.divider} />
              <section className={styles.section}>
                <h2 className={styles.headingLarge}>Lo que incluye</h2>
                <ul className={styles.list}>
                  {activity.whatIncludes.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {activity.attractions.length > 0 && (
            <>
              <div className={styles.divider} />
              <AttractionList
                heading={isTour ? "Paradas del recorrido" : "Atracciones"}
                attractions={activity.attractions}
                hrefFor={(attraction, idx) =>
                  `/panel/servicios/${item.id}/vista-previa/atracciones/${attraction.id ?? idx}`}
              />
            </>
          )}

          {activity.locationAddressDetails && (
            <>
              <div className={styles.divider} />
              <section className={styles.section}>
                <h2 className={styles.heading}>Ubicación exacta</h2>
                <p className={styles.infoItem}>{activity.locationAddressDetails}</p>
              </section>
            </>
          )}

          <div className={styles.divider} />
          <LocationMap
            embedUrl={detail.mapsEmbedUrl}
            address={detail.address}
            query={placeQuery}
          />

          {detail.reviews.length > 0 && (
            <>
              <div className={styles.divider} />
              <ReviewsList reviews={detail.reviews} />
            </>
          )}
        </div>
        <aside className={styles.barSlot}>
          <ReserveBar href={reserveHref} label={isTour ? "Reservar tour" : "Reservar"} />
        </aside>
      </div>
    </div>
  );
}
