"use client";

import Link from "next/link";
import { useActionState } from "react";
import { savePromotionAction } from "@/app/panel/promociones/actions";
import { Button, Panel } from "@/components/ui";
import type { DestinationOption } from "@/lib/panel-promotion-options";
import { isoToPanamaInput } from "@/lib/panel-form";

// Datos de una promoción tal como vienen de Supabase.
export type PromotionRecord = {
  id: string;
  slug: string;
  title: string;
  place_name: string;
  eyebrow: string;
  tags: string;
  period_label: string;
  discount_value: string;
  discount_suffix: string;
  price_line: string | null;
  photo_storage_path: string;
  photo_is_illustrative: boolean;
  valid_from: string;
  valid_to: string;
  is_published: boolean;
  sort_order: number;
  description: string | null;
  conditions: string | null;
  inclusions: string[];
  exclusions: string[];
  schedule_details: string | null;
  regular_price_cents: number | null;
  promotional_price_cents: number | null;
  destination_ref: string;
};

// Convierte centavos guardados en un texto de dólares para el campo de precio.
function centsToInput(cents: number | null) {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

// Formulario completo de promoción: textos, fechas, precios, destino y publicación.
export function PromotionForm({
  promotion,
  destinations,
}: {
  promotion: PromotionRecord | null;
  destinations: DestinationOption[];
}) {
  const [state, action, pending] = useActionState(savePromotionAction, { error: "" });
  const groups = [...new Set(destinations.map((item) => item.group))];

  return (
    <form action={action} className="promotion-form">
      <input type="hidden" name="promotion_id" value={promotion?.id ?? ""} />

      <Panel>
        <h2>Información principal</h2>
        <div className="form-row">
          <label className="field">
            Título
            <input name="title" required defaultValue={promotion?.title ?? ""} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            Lugar
            <input name="place_name" required defaultValue={promotion?.place_name ?? ""} />
          </label>
          <label className="field">
            Texto superior (opcional)
            <input name="eyebrow" defaultValue={promotion?.eyebrow ?? ""} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            Etiquetas (separadas por comas)
            <input name="tags" defaultValue={promotion?.tags ?? ""} />
          </label>
          <label className="field">
            Ruta de la imagen en Storage
            <input name="photo_storage_path" required
              defaultValue={promotion?.photo_storage_path ?? ""} />
          </label>
        </div>
        <label className="checkbox-option">
          <input type="checkbox" name="photo_is_illustrative"
            defaultChecked={promotion?.photo_is_illustrative ?? true} />
          La imagen es ilustrativa
        </label>
      </Panel>

      <Panel>
        <h2>Oferta y precios</h2>
        <div className="form-row">
          <label className="field">
            Descuento (texto principal)
            <input name="discount_value" required defaultValue={promotion?.discount_value ?? ""}
              placeholder="20%" />
          </label>
          <label className="field">
            Texto del descuento (opcional)
            <input name="discount_suffix" defaultValue={promotion?.discount_suffix ?? ""}
              placeholder="de descuento" />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            Precio regular (USD)
            <input name="regular_price" type="number" min="0" step="0.01"
              defaultValue={centsToInput(promotion?.regular_price_cents ?? null)} />
          </label>
          <label className="field">
            Precio promocional (USD)
            <input name="promotional_price" type="number" min="0" step="0.01"
              defaultValue={centsToInput(promotion?.promotional_price_cents ?? null)} />
          </label>
        </div>
        <small className="muted">
          El porcentaje de descuento se calcula automáticamente con los dos precios.
        </small>
        <label className="field">
          Línea de precio (opcional)
          <input name="price_line" defaultValue={promotion?.price_line ?? ""} />
        </label>
        <label className="field">
          Descripción
          <textarea name="description" rows={3} defaultValue={promotion?.description ?? ""} />
        </label>
        <label className="field">
          Condiciones
          <textarea name="conditions" rows={3} defaultValue={promotion?.conditions ?? ""} />
        </label>
        <div className="form-row">
          <label className="field">
            Incluye (una línea por elemento)
            <textarea name="inclusions" rows={4}
              defaultValue={(promotion?.inclusions ?? []).join("\n")} />
          </label>
          <label className="field">
            No incluye (una línea por elemento)
            <textarea name="exclusions" rows={4}
              defaultValue={(promotion?.exclusions ?? []).join("\n")} />
          </label>
        </div>
        <label className="field">
          Horarios de la promoción
          <textarea name="schedule_details" rows={2}
            defaultValue={promotion?.schedule_details ?? ""} />
        </label>
      </Panel>

      <Panel>
        <h2>Destino, vigencia y publicación</h2>
        <label className="field">
          Destino
          <select name="destination_ref" required defaultValue={promotion?.destination_ref ?? ""}>
            <option value="" disabled>Selecciona un destino</option>
            {groups.map((group) => (
              <optgroup label={group} key={group}>
                {destinations
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <option key={item.ref} value={item.ref}>{item.label}</option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="form-row">
          <label className="field">
            Inicio de vigencia
            <input name="valid_from" type="datetime-local" required
              defaultValue={isoToPanamaInput(promotion?.valid_from)} />
          </label>
          <label className="field">
            Fin de vigencia
            <input name="valid_to" type="datetime-local" required
              defaultValue={isoToPanamaInput(promotion?.valid_to)} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            Texto de vigencia para la web
            <input name="period_label" required defaultValue={promotion?.period_label ?? ""}
              placeholder="Octubre 2026" />
          </label>
          <label className="field">
            Orden en la web
            <input name="sort_order" type="number" min="0" max="32767"
              defaultValue={promotion?.sort_order ?? 0} />
          </label>
        </div>
        <label className="checkbox-option">
          <input
            type="checkbox"
            name="is_published"
            defaultChecked={promotion?.is_published ?? false}
          />
          Publicar en la web
        </label>
      </Panel>

      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <div className="actions sticky-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : promotion ? "Guardar promoción" : "Crear promoción"}
        </Button>
        <Link className="button quiet" href="/panel/promociones">Cancelar</Link>
      </div>
    </form>
  );
}
