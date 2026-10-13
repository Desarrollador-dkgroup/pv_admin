"use client";

import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import { usePreview } from "./context";

// Conserva los indicadores ilustrativos del diseño; los guardados actualizan la actividad local.
export function Dashboard() {
  const { role, data } = usePreview();
  const base = `/vista-previa/${role}`;
  const metrics =
    role === "admin"
      ? [
          ["Negocios activos", "24", "Empresas que forman parte de Panamá Viajero"],
          ["Servicios publicados", "86", "Contenido visible en la plataforma"],
          ["Promociones vigentes", "12", "Ofertas disponibles para los viajeros"],
          ["Pendientes de revisión", "7", "Servicios y promociones por validar"],
        ]
      : [
          ["Mis servicios", "2", "1 publicado · 1 borrador"],
          ["Mis promociones", "1", "Oferta vigente hasta el 31 de octubre"],
          ["Solicitudes", "1", "Una actualización en revisión"],
        ];
  return (
    <>
      <div className={`metrics ${role === "propietario" ? "three" : ""}`}>
        {metrics.map(([label, value, description]) => (
          <Panel key={label}>
            <span className="metric-label">{label}</span>
            <strong>{value}</strong>
            <small>{description}</small>
          </Panel>
        ))}
      </div>
      {role === "admin" ? (
        <div className="dashboard-grid">
          <Panel>
            <h2>Tu plataforma, de un vistazo</h2>
            <p className="muted">Distribución ilustrativa de servicios por categoría</p>
            <div className="bar-chart" aria-label="Distribución ilustrativa de servicios">
              {[
                ["Hospedajes", 32, 152],
                ["Restaurantes", 24, 118],
                ["Actividades", 14, 84],
                ["Transporte", 9, 60],
                ["Tours", 7, 46],
              ].map(([name, amount, height]) => (
                <div className="chart-column" key={name}>
                  <span>{amount}</span>
                  <div className="chart-bar" style={{ height: `${height}px` }} />
                  <small>{name}</small>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2>Requieren tu atención</h2>
            <Badge>7 solicitudes</Badge>
            {[
              ["Hotel Casa Casco", "Cambios de descripción y habitaciones"],
              ["Sabores del Istmo", "Nueva promoción: menú para dos"],
              ["Tour Bahía de Panamá", "Primera publicación del servicio"],
            ].map(([name, detail]) => (
              <Link href={`${base}/revision`} className="queue-item" key={name}>
                <b>{name}</b>
                <small>{detail}</small>
              </Link>
            ))}
            <Link href={`${base}/revision`} className="button secondary">
              Revisar solicitudes
            </Link>
          </Panel>
        </div>
      ) : (
        <Panel>
          <h2>Mis servicios</h2>
          {data.entities
            .filter(
              (entity) => entity.kind === "services" && entity.business === "Hotel Casa Casco",
            )
            .map((entity) => (
              <Link className="queue-item" key={entity.id} href={`${base}/servicios/${entity.id}`}>
                <b>{entity.name}</b>
                <Badge>{entity.status}</Badge>
              </Link>
            ))}
        </Panel>
      )}
      <aside className="notice">
        <b>
          {role === "admin" ? "Empieza por lo importante" : "Tu negocio, visible en Panamá Viajero"}
        </b>
        <small>
          {role === "admin"
            ? "Da acceso a los propietarios, revisa su contenido " +
              "y mantén los sitios turísticos actualizados."
            : "Completa la información, añade fotografías y envía tus cambios para revisión."}
        </small>
      </aside>
    </>
  );
}
