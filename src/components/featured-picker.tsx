"use client";

import { useMemo, useState } from "react";
import { PanelSelect } from "@/components/panel-select";
import { Badge, Button, Panel } from "@/components/ui";

export type FeaturedRow = {
  id: string;
  name: string;
  businessName: string;
  categoryId: string;
  categoryLabel: string;
  statusLabel: string;
  statusTone: "neutral" | "success" | "warning" | "danger" | "info";
  featured: boolean;
};

// Quita tildes y pasa a minúsculas, para que «panamá» encuentre «Panama».
function plain(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Botón «Destacar servicio» con buscador por nombre, negocio, categoría y estado.
export function FeaturedPicker({
  rows,
  categories,
  action,
}: {
  rows: FeaturedRow[];
  categories: { value: string; label: string }[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  const results = useMemo(() => {
    const term = plain(query.trim());
    return rows
      .filter((row) => {
        if (category && row.categoryId !== category) return false;
        if (!term) return true;
        return [row.name, row.businessName, row.categoryLabel, row.statusLabel]
          .some((text) => plain(text).includes(term));
      })
      // Los destacados van primero, para que siempre se vean al abrir el buscador.
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, "es"));
  }, [rows, query, category]);
  const featuredCount = rows.filter((row) => row.featured).length;

  return (
    <>
      <div className="section-heading">
        <Button tone="primary" onClick={() => setOpen((previous) => !previous)}>
          {open ? "Cerrar" : "Destacar servicio"}
        </Button>
      </div>
      {open && (
        <Panel>
          <div className="filter-row">
            <label className="filter-group">
              Buscar
              <input value={query} onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre, negocio, categoría o estado" />
            </label>
            <div className="filter-group">
              <span className="filter-label">Categoría</span>
              <PanelSelect aria-label="Categoría de los servicios"
                onChange={(event) => setCategory(event.target.value)}>
                <option value="">Todas las categorías</option>
                {categories.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </PanelSelect>
            </div>
          </div>
          <p className="muted">
            {featuredCount} destacados · {results.length} servicios encontrados
          </p>
          {results.slice(0, 30).map((row) => (
            <div className="list-row" key={row.id}>
              <div className="list-row-text">
                <b>{row.name}</b>
                <small>{row.businessName} · {row.categoryLabel}</small>
              </div>
              <Badge tone={row.statusTone}>{row.statusLabel}</Badge>
              <form action={action}>
                <input type="hidden" name="service_id" value={row.id} />
                <input type="hidden" name="featured" value={row.featured ? "false" : "true"} />
                <Button tone={row.featured ? "quiet" : "secondary"} type="submit" className="small">
                  {row.featured ? "Quitar" : "Destacar"}
                </Button>
              </form>
            </div>
          ))}
          {!results.length && <p className="muted">Ningún servicio coincide con la búsqueda.</p>}
          {results.length > 30 && (
            <p className="muted">Se muestran 30. Escribe más para afinar la búsqueda.</p>
          )}
        </Panel>
      )}
    </>
  );
}
