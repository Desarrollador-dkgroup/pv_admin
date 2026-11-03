"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveServicePromotionAction } from "@/app/panel/promociones/actions";
import { Button, Panel } from "@/components/ui";
import { formatCents } from "@/lib/panel-format";
import { previewPromotion, type CommissionTerms } from "@/lib/promotion-commission";

export type PromotionServiceOption = {
  id: string;
  name: string;
  categoryId: string;
  businessId: string;
  priceCents: number | null;
  rooms: Array<{ id: string; name: string; priceCents: number | null }>;
};

export type ServicePromotionRecord = {
  id: string;
  service_id: string;
  room_type_id: string | null;
  title: string;
  description: string | null;
  discount_pct: number;
  schedule_mode: "range" | "weekdays";
  starts_on: string | null;
  ends_on: string | null;
  weekdays: number[];
  is_active: boolean;
};

const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

// Formulario de promoción de servicio con vista previa de precio y comisión.
export function ServicePromotionForm({
  services,
  termsByBusiness,
  promotion,
}: {
  services: PromotionServiceOption[];
  termsByBusiness: Record<string, CommissionTerms | null>;
  promotion: ServicePromotionRecord | null;
}) {
  const [state, action, pending] = useActionState(saveServicePromotionAction, { error: "" });
  const firstPriced = services.find((item) =>
    item.priceCents || item.rooms.some((room) => room.priceCents));
  const [serviceId, setServiceId] = useState(
    promotion?.service_id ?? firstPriced?.id ?? services[0]?.id ?? "",
  );
  const [roomId, setRoomId] = useState(promotion?.room_type_id ?? "");
  const [discount, setDiscount] = useState(promotion ? String(promotion.discount_pct) : "");
  const [mode, setMode] = useState<"range" | "weekdays">(promotion?.schedule_mode ?? "range");

  const service = services.find((item) => item.id === serviceId);
  const isHotel = service?.categoryId === "hospedaje";
  const room = service?.rooms.find((item) => item.id === roomId);
  const regularCents = isHotel ? (room?.priceCents ?? null) : (service?.priceCents ?? null);
  const terms = service ? (termsByBusiness[service.businessId] ?? null) : null;
  const discountValue = Number(discount);
  const validDiscount = discountValue > 0 && discountValue < 100;
  const preview = terms && regularCents && validDiscount
    ? previewPromotion(regularCents, discountValue, terms)
    : null;
  const blocked = !regularCents || !validDiscount || Boolean(preview?.blocked)
    || (isHotel && !roomId);

  return (
    <form action={action} className="promotion-form">
      <input type="hidden" name="promotion_id" value={promotion?.id ?? ""} />

      <Panel>
        <h2>Servicio y descuento</h2>
        <label className="field">
          Servicio
          <select
            name="service_id"
            value={serviceId}
            onChange={(e) => { setServiceId(e.target.value); setRoomId(""); }}
          >
            {services.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>

        {isHotel && (
          <label className="field">
            Habitación con descuento
            <select
              name="room_type_id"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            >
              <option value="">Selecciona una habitación</option>
              {service?.rooms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {formatCents(item.priceCents)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          Título de la promoción
          <input name="title" required maxLength={120} defaultValue={promotion?.title ?? ""} />
        </label>

        <label className="field">
          Descripción
          <textarea
            name="description"
            rows={3}
            maxLength={600}
            defaultValue={promotion?.description ?? ""}
          />
        </label>

        <label className="field">
          Porcentaje de descuento
          <input
            name="discount_pct"
            type="number"
            min="0.01"
            max="99.99"
            step="0.01"
            required
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
      </Panel>

      <Panel>
        <h2>Cuándo aplica</h2>
        <fieldset className="field">
          <legend>Vigencia</legend>
          <label className="checkbox-option">
            <input
              type="radio"
              name="schedule_mode"
              value="range"
              checked={mode === "range"}
              onChange={() => setMode("range")}
            />
            Entre dos fechas
          </label>
          <label className="checkbox-option">
            <input
              type="radio"
              name="schedule_mode"
              value="weekdays"
              checked={mode === "weekdays"}
              onChange={() => setMode("weekdays")}
            />
            Solo ciertos días de la semana
          </label>
        </fieldset>

        {mode === "range" && (
          <div className="form-row">
            <label className="field">
              Fecha de inicio
              <input type="date" name="starts_on" defaultValue={promotion?.starts_on ?? ""} />
            </label>
            <label className="field">
              Fecha de fin
              <input type="date" name="ends_on" defaultValue={promotion?.ends_on ?? ""} />
            </label>
          </div>
        )}

        {mode === "weekdays" && (
          <fieldset className="field">
            <legend>Días</legend>
            {WEEKDAY_OPTIONS.map((day) => (
              <label key={day.value} className="checkbox-option">
                <input
                  type="checkbox"
                  name="weekday"
                  value={day.value}
                  defaultChecked={promotion?.weekdays.includes(day.value) ?? false}
                />
                {day.label}
              </label>
            ))}
          </fieldset>
        )}

        <label className="checkbox-option">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={promotion?.is_active ?? true}
          />
          Promoción activa
        </label>
      </Panel>

      <Panel>
        <h2>Vista previa de precio y comisión</h2>
        {!service && <p className="muted">Selecciona un servicio.</p>}
        {service && !terms && (
          <p className="muted">Este negocio aún no tiene contrato: no hay límite de descuento.</p>
        )}
        {service && !regularCents && (
          <p className="form-error" role="alert">
            {isHotel
              ? "Esta habitación no tiene precio. Agrégalo en la habitación antes de crear promociones."
              : "Este servicio no tiene precio regular. Agrégalo antes de crear promociones."}
          </p>
        )}
        {isHotel && !roomId && <p className="muted">Selecciona la habitación para ver el cálculo.</p>}
        {!validDiscount && discount !== "" && (
          <p className="form-error" role="alert">El descuento debe ser mayor que 0% y menor que 100%.</p>
        )}
        {!validDiscount && discount === "" && (
          <p className="muted">Escribe el porcentaje de descuento para ver el cálculo.</p>
        )}
        {preview && regularCents && (
          <>
            <p>
              Precio regular <b>{formatCents(regularCents)}</b> → precio con descuento{" "}
              <b>{formatCents(preview.finalPriceCents)}</b>
            </p>
            <p>
              Comisión aplicada: <b>{preview.commissionPct}%</b> · Ganancia para la plataforma:{" "}
              <b>{formatCents(preview.profitCents)}</b>
            </p>
            {preview.exceedsLimit && !preview.blocked && (
              <p className="form-warning" role="status">
                El descuento supera el límite de tu contrato ({terms?.discountLimitPct}%).
                La comisión sube a {preview.commissionPct}% solo para este servicio.
              </p>
            )}
            {preview.blocked && (
              <p className="form-error" role="alert">
                No se puede guardar: tu contrato permite un descuento máximo de{" "}
                {preview.maxDiscountPct}% en este servicio.
              </p>
            )}
          </>
        )}
      </Panel>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <footer className="sticky-actions">
        <Link className="button quiet" href="/panel/promociones">Cancelar</Link>
        <Button type="submit" tone="primary" disabled={pending || blocked}>
          {pending ? "Guardando..." : "Guardar promoción"}
        </Button>
      </footer>
    </form>
  );
}
