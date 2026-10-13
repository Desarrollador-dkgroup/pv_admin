"use client";

import Link from "next/link";
import { useState } from "react";
import { categories } from "@/data/preview";
import { kindRoutes } from "@/data/forms";
import { getBusinessCategories, getBusinessOwner } from "@/lib/preview-catalog";
import type { EntityKind, PreviewEntity } from "@/types/preview";
import { Badge, Button, Panel } from "@/components/ui";
import { usePreview } from "./context";

// Busca y pagina registros; los propietarios activos tienen prioridad al abrir su listado.
export function EntityList({ kind, parentId }: { kind: EntityKind; parentId?: string }) {
  const { role, data } = usePreview();
  // Cada listado mantiene sus propios filtros y reinicia la página al modificarlos.
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(kind === "owners" ? "Activo" : "");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const base = `/vista-previa/${role}/${kindRoutes[kind]}`;
  const catalog =
    kind === "businesses"
      ? [...categories, { id: "cliente", name: "Cliente", description: "" }]
      : categories;
  const records = data.entities.filter(
    (entity) =>
      entity.kind === kind &&
      (role === "admin" || entity.business === "Hotel Casa Casco") &&
      (!parentId || entity.parentId === parentId),
  );
  const categoryIds = (entity: PreviewEntity) =>
    kind === "businesses" ? getBusinessCategories(entity, data.entities) : [entity.category];
  const categoryLabel = (entity: PreviewEntity) =>
    categoryIds(entity)
      .map((id) => catalog.find((item) => item.id === id)?.name)
      .filter(Boolean)
      .join(" · ") || "Sin definir";
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  // Incluye el propietario y las categorías en la búsqueda de negocios.
  const filtered = records.filter((entity) => {
    const owner = kind === "businesses" ? getBusinessOwner(entity, data.entities) : "";
    const text = [entity.name, entity.business, entity.fields.email, owner, categoryLabel(entity)];
    return (
      normalize(text.join(" ")).includes(normalize(query)) &&
      (!status || entity.status === status) &&
      (!category || categoryIds(entity).includes(category))
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 6));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * 6, current * 6);
  const headers =
    kind === "sites"
      ? ["Nombre", "País", "Destino", "Acciones"]
      : kind === "businesses"
        ? ["Nombre", "Propietario", "Categoría", "Estado", "Acciones"]
        : [
            kind === "owners" ? "Propietario" : "Nombre",
            kind === "owners" ? "Correo" : kind === "services" ? "Categoría" : "Información",
            "Estado",
            "Acciones",
          ];
  const statusOptions =
    kind === "owners"
      ? [
          { value: "Activo", label: "Activos" },
          { value: "Suspendido", label: "Suspendido" },
          { value: "", label: "Todos" },
        ]
      : [
          { value: "", label: "Todos los estados" },
          ...[...new Set(records.map((entity) => entity.status))].map((value) => ({
            value,
            label: value,
          })),
        ];

  return (
    <>
      <div className="filters">
        <label>
          Buscar
          <input
            value={query}
            placeholder="Buscar por nombre, propietario, negocio o correo"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Estado
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {["services", "businesses"].includes(kind) && (
          <label>
            Categoría
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {headers.map((header) => (
                  <th key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((entity) => (
                <tr key={entity.id}>
                  <td>{entity.name}</td>
                  {kind === "sites" ? (
                    <>
                      <td>{entity.fields.country || "Panamá"}</td>
                      <td>{entity.fields.province || "Sin definir"}</td>
                    </>
                  ) : (
                    <>
                      {kind === "businesses" && <td>{getBusinessOwner(entity, data.entities)}</td>}
                      <td>
                        {kind === "owners"
                          ? entity.fields.email
                          : ["services", "businesses"].includes(kind)
                            ? categoryLabel(entity)
                            : kind === "rooms"
                              ? `${entity.fields.capacity} personas · $${entity.fields.price}`
                              : kind === "dishes"
                                ? `${entity.fields.section} · $${entity.fields.price}`
                                : entity.business}
                      </td>
                      <td>
                        <Badge>{entity.status}</Badge>
                      </td>
                    </>
                  )}
                  <td>
                    <Link
                      href={`${base}/${entity.id}`}
                      className="button secondary"
                      aria-label={`Editar ${entity.name}`}
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <div className="empty-state">
            <h2>No encontramos registros</h2>
            <p>Prueba otra búsqueda o cambia los filtros.</p>
          </div>
        )}
        <footer className="table-footer">
          <small>{filtered.length} registros de ejemplo</small>
          <div className="pagination">
            <Button tone="quiet" disabled={current <= 1} onClick={() => setPage(current - 1)}>
              ←
            </Button>
            <span>
              {current} / {pageCount}
            </span>
            <Button
              tone="quiet"
              disabled={current >= pageCount}
              onClick={() => setPage(current + 1)}
            >
              →
            </Button>
          </div>
        </footer>
      </Panel>
    </>
  );
}
