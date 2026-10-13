"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Modal, Panel } from "@/components/ui";
import { usePreview } from "./context";

// Modela el recorrido de revisión sin ejecutar publicaciones reales.
export function Review({ id }: { id?: string }) {
  const { data, role, save } = usePreview();
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState<"publish" | "corrections" | null>(null);
  const records = data.entities.filter(
    (entity) =>
      entity.status === "En revisión" &&
      (role === "admin" || entity.business === "Hotel Casa Casco"),
  );
  const record = id ? records.find((entity) => entity.id === id) : undefined;
  const base = `/vista-previa/${role}`;
  if (!record)
    return (
      <Panel>
        <h2>{role === "admin" ? "Contenido por revisar" : "Mis solicitudes"}</h2>
        {records.map((entity) => (
          <Link className="queue-item" key={entity.id} href={`${base}/revision/${entity.id}`}>
            <b>{entity.name}</b>
            <span>
              {entity.business} · {entity.kind === "services" ? "Servicio" : "Promoción"}
            </span>
            <Badge>{entity.status}</Badge>
          </Link>
        ))}
        {!records.length && <p>No hay solicitudes pendientes en la vista previa.</p>}
      </Panel>
    );

  return (
    <>
      <Badge>Pendiente de revisión</Badge>
      <div className="editor-grid">
        <Panel>
          <h2>Versión publicada</h2>
          <h3>{record.name}</h3>
          <p>Referencia ilustrativa de la versión anterior.</p>
          <Badge>Publicado</Badge>
        </Panel>
        <Panel>
          <h2>Cambios del propietario</h2>
          <h3>{record.name}</h3>
          <p>
            {record.fields.description || record.fields.short_description || "Nueva publicación"}
          </p>
          <p>Negocio: {record.business}</p>
          <Badge>En revisión</Badge>
        </Panel>
      </div>
      {role === "admin" && (
        <>
          <label className="field">
            Comentario para el propietario
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </label>
          <footer className="sticky-actions">
            <Link href={`${base}/revision`} className="button quiet">
              Volver a solicitudes
            </Link>
            <Button tone="secondary" onClick={() => setDecision("corrections")}>
              Solicitar correcciones
            </Button>
            <Button onClick={() => setDecision("publish")}>Aprobar y publicar</Button>
          </footer>
        </>
      )}
      {decision && (
        <Modal
          title={decision === "publish" ? "¿Aprobar este contenido?" : "Solicitar correcciones"}
          onClose={() => setDecision(null)}
        >
          {decision === "corrections" && (
            <label className="field">
              Observaciones
              <textarea
                rows={3}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </label>
          )}
          <p>Esta acción modifica solamente la vista previa.</p>
          <div className="actions">
            <Button tone="secondary" onClick={() => setDecision(null)}>
              Cancelar
            </Button>
            <Button
              disabled={decision === "corrections" && !comment.trim()}
              onClick={() => {
                save(
                  {
                    ...record,
                    status: decision === "publish" ? "Publicado" : "Correcciones solicitadas",
                    fields: { ...record.fields, review_comment: comment },
                  },
                  decision === "publish"
                    ? "Contenido publicado en la vista previa"
                    : "Correcciones solicitadas",
                );
                setDecision(null);
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
