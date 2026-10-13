"use client";

import Link from "next/link";
import { useState } from "react";
import { categories } from "@/data/preview";
import { kindRoutes, kindTitles, sectionKinds } from "@/data/forms";
import { Badge, Button, Panel } from "@/components/ui";
import type { PreviewRole } from "@/types/preview";
import { PreviewProvider, usePreview } from "./context";
import { PreviewShell } from "./shell";
import { Dashboard } from "./dashboard";
import { EntityList } from "./entity-list";
import { EntityEditor } from "./entity-editor";
import { Gallery } from "./gallery";
import { Locations } from "./locations";
import { OwnerAccess } from "./owner-access";
import { InviteModal } from "./invite";
import { Review } from "./review";
import { Account } from "./account";
import { NotificationsPage } from "./notifications";

type Props = { role: PreviewRole; path: string[]; category?: string; parentId?: string };

// Cada pantalla del prototipo se convierte en una ruta con componentes compartidos.
function Screen({ role, path, category, parentId }: Props) {
  const { data } = usePreview();
  const [invite, setInvite] = useState(false);
  const [section = "", id, tab] = path;
  const kind = sectionKinds[section];
  const record = data.entities.find(
    (entity) =>
      entity.id === id &&
      entity.kind === kind &&
      (role === "admin" || entity.business === "Hotel Casa Casco"),
  );
  const base = `/vista-previa/${role}`;
  const restricted =
    role === "propietario" && ["propietarios", "negocios", "sitios", "historial"].includes(section);
  let title =
    section === "notificaciones"
      ? "Notificaciones"
      : section === "cuenta"
        ? "Mi cuenta"
        : section === "revision"
          ? "Contenido por revisar"
          : section === "historial"
            ? "Historial de cambios"
            : section === "mi-negocio"
              ? "Mi negocio"
              : !section
                ? role === "admin"
                  ? "Inicio"
                  : "Bienvenida, María"
                : kind
                  ? kindTitles[kind]
                  : "Página no encontrada";
  if (kind && id)
    title =
      tab === "galeria"
        ? "Galería del servicio"
        : tab === "ubicaciones"
          ? "Ubicaciones del servicio"
          : id === "nuevo"
            ? `Crear ${kindTitles[kind].toLowerCase()}`
            : (record?.name ?? "Registro no encontrado");
  const business = data.entities.find((entity) => entity.id === "negocio");
  const creationAction =
    section === "propietarios" ? (
      <Button onClick={() => setInvite(true)}>+ Dar acceso a propietario</Button>
    ) : kind && !id ? (
      <Link
        className="button primary"
        href={`${base}/${kindRoutes[kind]}/nuevo${parentId ? `?servicio=${parentId}` : ""}`}
      >
        + Crear {kindTitles[kind].toLowerCase()}
      </Link>
    ) : undefined;

  let content;
  if (restricted)
    content = (
      <Panel>
        <h2>Esta sección pertenece al administrador</h2>
        <Link href={base} className="button secondary">
          Volver a mi negocio
        </Link>
      </Panel>
    );
  else if (!section)
    content =
      role === "admin" ? (
        <Panel>
          <h2>Sección no habilitada</h2>
        </Panel>
      ) : (
        <Dashboard />
      );
  else if (section === "cuenta") content = <Account />;
  else if (section === "notificaciones") content = <NotificationsPage />;
  else if (section === "revision") content = <Review id={id} />;
  else if (section === "historial")
    content = (
      <Panel>
        <h2>Actividad de la vista previa</h2>
        {data.history.map((event) => (
          <div className="history-event" key={event.id}>
            <b>{event.action}</b>
            <span>{event.actor}</span>
            <small>
              {new Date(event.date).toLocaleString("es-PA", { timeZone: "America/Panama" })}
            </small>
          </div>
        ))}
        {!data.history.length && <p>Los cambios que hagas aparecerán aquí.</p>}
      </Panel>
    );
  else if (section === "mi-negocio" && business)
    content = <EntityEditor key={business.id} kind="businesses" record={business} />;
  else if (kind && !id) content = <EntityList key={kind} kind={kind} parentId={parentId} />;
  else if (kind === "services" && id === "nuevo" && !category)
    content = (
      <div className="category-list">
        {categories.map((item) => (
          <Panel key={item.id}>
            <div>
              <h2>{item.name}</h2>
              <p>{item.description}</p>
            </div>
            <Link
              className="button secondary"
              href={`${base}/servicios/nuevo?categoria=${item.id}`}
            >
              Seleccionar
            </Link>
          </Panel>
        ))}
      </div>
    );
  else if (record && kind === "owners") content = <OwnerAccess record={record} />;
  else if (record && tab === "galeria") content = <Gallery record={record} />;
  else if (record && tab === "ubicaciones") content = <Locations key={record.id} record={record} />;
  else if (kind && (record || id === "nuevo"))
    content = (
      <>
        {record?.fields.review_comment && (
          <aside className="notice">
            <b>Observaciones de revisión</b>
            <span>{record.fields.review_comment}</span>
          </aside>
        )}
        <EntityEditor
          key={`${kind}-${id}-${category}`}
          kind={kind}
          record={record}
          category={category}
          parentId={parentId}
        />
      </>
    );
  else
    content = (
      <Panel>
        <h2>No encontramos esta página</h2>
        <Link href={base} className="button secondary">
          Volver al inicio
        </Link>
      </Panel>
    );

  return (
    <PreviewShell
      title={title}
      section={section}
      actions={!restricted ? creationAction : undefined}
    >
      {record && <Badge>{record.status}</Badge>}
      {content}
      {invite && <InviteModal onClose={() => setInvite(false)} />}
    </PreviewShell>
  );
}

export function PreviewApplication(props: Props) {
  return (
    <PreviewProvider role={props.role}>
      <Screen {...props} />
    </PreviewProvider>
  );
}
