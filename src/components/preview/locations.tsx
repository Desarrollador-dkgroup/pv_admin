"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Modal, Panel } from "@/components/ui";
import type { PreviewEntity } from "@/types/preview";
import { usePreview } from "./context";

// Permite varias ubicaciones y conserva la primera selección como sitio principal.
export function Locations({ record }: { record: PreviewEntity }) {
  const { role, data, save, notify } = usePreview();
  const [selected, setSelected] = useState(record.sites);
  const [query, setQuery] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const sites = data.entities.filter(
    (entity) => entity.kind === "sites" && entity.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <>
      <Panel>
        <h2>¿Dónde pueden encontrar tu servicio?</h2>
        <p>Selecciona todos los sitios turísticos relacionados.</p>
        <label className="field">
          Buscar sitio
          <input
            value={query}
            placeholder="Nombre del sitio turístico"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="location-options">
          {sites.map((site) => (
            <label className="checkbox-option" key={site.id}>
              <input
                type="checkbox"
                checked={selected.includes(site.id)}
                onChange={(event) => {
                  setSelected((current) =>
                    event.target.checked
                      ? [...current, site.id]
                      : current.filter((id) => id !== site.id),
                  );
                }}
              />
              <span>
                {site.name}
                {selected[0] === site.id ? " · sitio principal" : ""}
              </span>
            </label>
          ))}
        </div>
        {!sites.length && <p>No hay sitios coincidentes.</p>}
        <small>El servicio aparecerá en cada sitio seleccionado, sin duplicarse.</small>
        {role === "admin" ? (
          <Link href="/vista-previa/admin/sitios/nuevo" className="button secondary">
            + Crear sitio turístico
          </Link>
        ) : (
          <Button tone="secondary" onClick={() => setRequestOpen(true)}>
            No encuentro mi sitio
          </Button>
        )}
      </Panel>
      <footer className="sticky-actions">
        <Link className="button secondary" href={`/vista-previa/${role}/servicios/${record.id}`}>
          Volver al servicio
        </Link>
        <Button onClick={() => save({ ...record, sites: selected }, "Ubicaciones guardadas")}>
          Guardar ubicaciones
        </Button>
      </footer>
      {requestOpen && (
        <Modal title="Solicitar un sitio turístico" onClose={() => setRequestOpen(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              notify(
                "Solicitud registrada en el recorrido de prueba. " +
                  "No se envió a un administrador real.",
              );
              setRequestOpen(false);
            }}
          >
            <label className="field">
              Nombre del sitio
              <input required />
            </label>
            <label className="field">
              Provincia
              <input required />
            </label>
            <label className="field">
              Referencia
              <textarea required rows={3} />
            </label>
            <Button type="submit">Enviar solicitud de prueba</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
