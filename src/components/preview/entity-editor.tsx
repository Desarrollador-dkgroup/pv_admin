"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Panel } from "@/components/ui";
import { categories } from "@/data/preview";
import { categoryFields, entityFields, kindRoutes } from "@/data/forms";
import { validatePromotionPrices } from "@/types/content";
import type { EntityKind, PreviewEntity } from "@/types/preview";
import { usePreview } from "./context";
import { Field } from "./field";
import { PromotionFields } from "./promotion-fields";

type Props = { kind: EntityKind; record?: PreviewEntity; category?: string; parentId?: string };

// Guarda borradores o envíos locales y reutiliza los campos de cada categoría.
export function EntityEditor({ kind, record, category = "hospedaje", parentId }: Props) {
  const { role, data, save } = usePreview();
  const router = useRouter();
  const [name, setName] = useState(record?.name ?? "");
  const [fields, setFields] = useState(record?.fields ?? {});
  const [business, setBusiness] = useState(record?.business ?? "Hotel Casa Casco");
  const [error, setError] = useState("");
  const selectedCategory = record?.category || category;
  const base = `/vista-previa/${role}`;
  const route =
    role === "propietario" && kind === "businesses" ? "mi-negocio" : kindRoutes[kind];
  const change = (key: string, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const intent = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    try {
      if (kind === "promotions") {
        if (!fields.regular_price || !fields.promotional_price) {
          throw new Error("Completa ambos precios de la promoción.");
        }
        validatePromotionPrices({
          description: null,
          conditions: null,
          inclusions: [],
          exclusions: [],
          schedule_details: null,
          currency: "USD",
          regular_price_cents: Math.round(Number(fields.regular_price) * 100),
          promotional_price_cents: Math.round(Number(fields.promotional_price) * 100),
        });
        if (fields.valid_from && fields.valid_to && fields.valid_to < fields.valid_from) {
          throw new Error("La fecha final no puede ser anterior a la fecha de inicio.");
        }
      }
      const status =
        intent?.value === "draft" ? "Borrador" : role === "admin" ? "Publicado" : "En revisión";
      const saved = save(
        {
          id: record?.id ?? crypto.randomUUID(),
          kind,
          name: name.trim(),
          category: selectedCategory,
          business: role === "propietario" ? "Hotel Casa Casco" : business,
          fields,
          sites: record?.sites ?? [],
          photos: record?.photos ?? [],
          parentId: record?.parentId ?? parentId,
          status: ["services", "promotions"].includes(kind) ? status : (record?.status ?? "Activo"),
        },
        intent?.value === "draft"
          ? "Borrador guardado"
          : role === "propietario"
            ? "Cambios enviados a revisión"
            : "Registro guardado",
      );
      if (!saved) return;
      router.push(`${base}/${route}${parentId ? `?servicio=${parentId}` : ""}`);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo guardar el registro.");
    }
  }

  return (
    <>
      {kind === "services" && record && (
        <nav className="editor-tabs" aria-label="Secciones del servicio">
          <Badge>Información general</Badge>
          <Link href={`${base}/servicios/${record.id}/galeria`}>Galería</Link>
          <Link href={`${base}/servicios/${record.id}/ubicaciones`}>Ubicaciones</Link>
        </nav>
      )}
      <form id="entity-form" onSubmit={submit} className="editor-grid">
        <Panel>
          <Field
            definition={{
              key: "name",
              label: kind === "promotions" ? "Título" : "Nombre",
              required: true,
            }}
            value={name}
            onChange={setName}
          />
          {role === "admin" && ["services", "promotions"].includes(kind) && (
            <label className="field">
              Negocio
              <select value={business} onChange={(event) => setBusiness(event.target.value)}>
                {data.entities
                  .filter((entity) => entity.kind === "businesses")
                  .map((entity) => (
                    <option key={entity.id}>{entity.name}</option>
                  ))}
              </select>
            </label>
          )}
          {kind === "services" && (
            <>
              {role === "propietario" && (
                <label className="field">
                  Negocio
                  <input value="Hotel Casa Casco" readOnly />
                </label>
              )}
              {[
                { key: "short_description", label: "Descripción breve" },
                { key: "description", label: "Descripción completa", type: "textarea" as const },
              ].map((definition) => (
                <Field
                  key={definition.key}
                  definition={definition}
                  value={fields[definition.key] ?? ""}
                  onChange={(value) => change(definition.key, value)}
                />
              ))}
              <label className="field">
                Sitios turísticos
                <input
                  readOnly
                  value={
                    record?.sites
                      .map((id) => data.entities.find((entity) => entity.id === id)?.name)
                      .filter(Boolean)
                      .join(" · ") ?? ""
                  }
                  placeholder="Guarda el servicio para seleccionar sus sitios"
                />
              </label>
            </>
          )}
          {kind === "promotions" && (
            <>
              <label className="field">
                Servicio asociado
                <select
                  required
                  value={fields.service ?? ""}
                  onChange={(event) => change("service", event.target.value)}
                >
                  <option value="">Selecciona un servicio</option>
                  {data.entities
                    .filter((entity) => entity.kind === "services" && entity.business === business)
                    .map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                </select>
              </label>
              {[
                { key: "description", label: "Descripción", type: "textarea" as const },
                {
                  key: "valid_from",
                  label: "Fecha de inicio",
                  type: "date" as const,
                  required: true,
                },
                {
                  key: "valid_to",
                  label: "Fecha de finalización",
                  type: "date" as const,
                  required: true,
                },
              ].map((definition) => (
                <Field
                  key={definition.key}
                  definition={definition}
                  value={fields[definition.key] ?? ""}
                  onChange={(value) => change(definition.key, value)}
                />
              ))}
            </>
          )}
          {(entityFields[kind] ?? []).map((definition) => (
            <Field
              key={definition.key}
              definition={definition}
              value={fields[definition.key] ?? ""}
              onChange={(value) => change(definition.key, value)}
            />
          ))}
        </Panel>
        {kind === "services" && (
          <Panel>
            <h2>
              Información de{" "}
              {categories.find((item) => item.id === selectedCategory)?.name.toLowerCase()}
            </h2>
            {(categoryFields[selectedCategory] ?? []).map((definition) => (
              <Field
                key={definition.key}
                definition={definition}
                value={fields[definition.key] ?? ""}
                onChange={(value) => change(definition.key, value)}
              />
            ))}
            {record && ["hospedaje", "restaurantes"].includes(selectedCategory) && (
              <Link
                className="button secondary"
                href={`${base}/${
                  selectedCategory === "hospedaje" ? "habitaciones" : "menu"
                }?servicio=${record.id}`}
              >
                Gestionar {selectedCategory === "hospedaje" ? "habitaciones" : "menú"}
              </Link>
            )}
            <small>Galería, precios y ubicaciones se muestran en la página pública.</small>
          </Panel>
        )}
        {kind === "promotions" && <PromotionFields fields={fields} change={change} />}
      </form>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <footer className="sticky-actions">
        <Link href={`${base}/${route}`} className="button quiet">
          Volver
        </Link>
        <Button type="submit" form="entity-form" name="intent" value="draft" tone="secondary">
          Guardar borrador
        </Button>
        <Button type="submit" form="entity-form" name="intent" value="publish">
          {role === "admin" ? "Guardar cambios" : "Enviar a revisión"}
        </Button>
      </footer>
    </>
  );
}
