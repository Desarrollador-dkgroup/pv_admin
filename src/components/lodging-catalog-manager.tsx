"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Panel } from "@/components/ui";
import { getLodgingUnitFields } from "@/data/lodging-details";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { slugify } from "@/lib/panel-slug";
import { deleteRoomTypeAction, updateRoomTypeAction } from "@/app/panel/servicios/[id]/unidades/actions";

export type Room = {
  id: string;
  name: string;
  description: string;
  capacity: number;
  beds_label: string;
  price_cents: number;
  total_units: number;
  booking_unit: string;
  bedroom_count: number | null;
  bathroom_count: number | null;
  area_m2: number | null;
  details: Record<string, string>;
};

export type Area = {
  id: string;
  name: string;
  description: string | null;
  is_available: boolean;
  opening_hours: string | null;
  capacity: number | null;
  included_in_rate: boolean | null;
  additional_price_cents: number | null;
  access_details: string | null;
  details: Record<string, string>;
};

export type RatePeriod = {
  id: string;
  room_type_id: string;
  valid_from: string;
  valid_to: string;
  price_cents: number;
  minimum_nights: number | null;
  included_guests: number | null;
  extra_guest_price_cents: number | null;
  cleaning_fee_cents: number | null;
  taxes_details: string | null;
  deposit_cents: number | null;
  cancellation_policy: string | null;
};

// Gestiona unidades reservables y espacios con galerías independientes.
export function LodgingCatalogManager({
  serviceId,
  lodgingTypeId,
  isOwner = false,
  rooms: initialRooms,
  areas: initialAreas,
  rates: initialRates,
}: {
  serviceId: string;
  lodgingTypeId: string;
  isOwner?: boolean;
  rooms: Room[];
  areas: Area[];
  rates: RatePeriod[];
}) {
  const router = useRouter();
  const [rooms, setRooms] = useState(initialRooms);
  const [areas, setAreas] = useState(initialAreas);
  const [rates, setRates] = useState(initialRates);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [roomErrorId, setRoomErrorId] = useState<string | null>(null);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const unitFields = getLodgingUnitFields(lodgingTypeId);

  async function saveRoom(formData: FormData) {
    setBusy(true);
    setError("");
    setNotice("");
    setRoomErrorId(null);
    const supabase = getSupabaseBrowserClient();
    const name = value(formData, "room_name");
    const payload = {
      service_id: serviceId,
      name,
      // room_types.slug es obligatorio en Supabase. Es interno y permanece
      // estable aunque el propietario cambie después el nombre visible.
      slug: `${slugify(name, "habitacion").slice(0, 40)}-${crypto.randomUUID().slice(0, 12)}`,
      description: value(formData, "room_description"),
      capacity: Number(value(formData, "capacity")),
      beds_label: value(formData, "beds_label"),
      price_cents: Math.round(Number(value(formData, "price")) * 100),
      total_units: Number(value(formData, "total_units")),
      booking_unit: value(formData, "booking_unit"),
      bedroom_count: numberOrNull(value(formData, "bedroom_count")),
      bathroom_count: numberOrNull(value(formData, "bathroom_count")),
      area_m2: numberOrNull(value(formData, "area_m2")),
      details: Object.fromEntries(
        [...formData.entries()]
          .filter(([key]) => key.startsWith("unit__"))
          .map(([key, item]) => [key.slice(6), String(item).trim()]),
      ),
      position: rooms.length,
    };
    const { data, error: failure } = await supabase
      .from("room_types")
      .insert(payload)
      .select(
        "id, name, description, capacity, beds_label, price_cents, total_units, " +
        "booking_unit, bedroom_count, bathroom_count, area_m2, details",
      )
      .single();
    if (failure) setError(failure.message);
    else {
      setRooms((current) => [...current, data as unknown as Room]);
      setNotice(`Se agregó ${name}. Puedes agregar otro tipo de habitación.`);
      router.refresh();
    }
    setBusy(false);
  }

  // Conserva el identificador de la habitación y su inventario existente. Una
  // reserva puede referenciarla; borrar y recrear la fila rompería ese vínculo.
  async function updateRoom(roomId: string, formData: FormData) {
    setBusy(true);
    setError("");
    setNotice("");
    setRoomErrorId(null);
    try {
      const result = await updateRoomTypeAction(serviceId, roomId, formData);
      if (result.error || !result.room) {
        setRoomErrorId(roomId);
        setError(result.error || "No se pudo actualizar la habitación.");
      } else {
        setRooms((current) => current.map((room) =>
          room.id === roomId ? result.room! : room));
        setEditingRoomId(null);
        setNotice("Los cambios de la habitación se guardaron.");
        router.refresh();
      }
    } catch {
      setRoomErrorId(roomId);
      setError("No se pudo actualizar la habitación. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function saveArea(formData: FormData) {
    setBusy(true);
    setError("");
    const supabase = getSupabaseBrowserClient();
    const { data, error: failure } = await supabase
      .from("lodging_areas")
      .insert({
        service_id: serviceId,
        name: value(formData, "area_name"),
        description: nullable(value(formData, "area_description")),
        opening_hours: nullable(value(formData, "opening_hours")),
        capacity: numberOrNull(value(formData, "area_capacity")),
        included_in_rate: formData.get("included_in_rate") === "on",
        additional_price_cents: priceOrNull(value(formData, "additional_price")),
        access_details: nullable(value(formData, "access_details")),
        details: Object.fromEntries(
          [...formData.entries()]
            .filter(([key]) => key.startsWith("area__"))
            .map(([key, item]) => [key.slice(6), String(item).trim()]),
        ),
        position: areas.length,
      })
      .select(
        "id, name, description, is_available, opening_hours, capacity, " +
        "included_in_rate, additional_price_cents, access_details, details",
      )
      .single();
    if (failure) setError(failure.message);
    else {
      setAreas((current) => [...current, data as unknown as Area]);
      router.refresh();
    }
    setBusy(false);
  }

  async function updateArea(areaId: string, formData: FormData) {
    setBusy(true);
    setError("");
    setNotice("");
    setRoomErrorId(null);
    const changes = {
      name: value(formData, "area_name"),
      description: nullable(value(formData, "area_description")),
      is_available: formData.get("is_available") === "on",
      ...(!isOwner ? {
        opening_hours: nullable(value(formData, "opening_hours")),
        capacity: numberOrNull(value(formData, "area_capacity")),
        included_in_rate: formData.get("included_in_rate") === "on",
        additional_price_cents: priceOrNull(value(formData, "additional_price")),
        access_details: nullable(value(formData, "access_details")),
        details: Object.fromEntries(
        [...formData.entries()]
          .filter(([key]) => key.startsWith("area__"))
          .map(([key, item]) => [key.slice(6), String(item).trim()]),
        ),
      } : {}),
    };
    if (!changes.name) {
      setError("Escribe el nombre del área.");
      setBusy(false);
      return;
    }
    const { data, error: failure } = await getSupabaseBrowserClient()
      .from("lodging_areas")
      .update(changes)
      .eq("id", areaId)
      .eq("service_id", serviceId)
      .select("id, name, description, is_available, opening_hours, capacity, " +
        "included_in_rate, additional_price_cents, access_details, details")
      .single();
    if (failure || !data) setError(failure?.message ?? "No se pudo actualizar el área.");
    else {
      setAreas((current) => current.map((area) =>
        area.id === areaId ? data as unknown as Area : area));
      setEditingAreaId(null);
      setNotice("Los cambios del área se guardaron.");
      router.refresh();
    }
    setBusy(false);
  }

  // Registra un precio temporal y sus condiciones para una unidad.
  async function saveRate(formData: FormData) {
    setBusy(true);
    setError("");
    const roomTypeId = value(formData, "room_type_id");
    const { data, error: failure } = await getSupabaseBrowserClient()
      .from("lodging_rate_periods")
      .insert({
        room_type_id: roomTypeId,
        valid_from: value(formData, "valid_from"),
        valid_to: value(formData, "valid_to"),
        price_cents: priceOrNull(value(formData, "season_price")),
        minimum_nights: numberOrNull(value(formData, "minimum_nights")),
        included_guests: numberOrNull(value(formData, "included_guests")),
        extra_guest_price_cents: priceOrNull(value(formData, "extra_guest_price")),
        cleaning_fee_cents: priceOrNull(value(formData, "cleaning_fee")),
        deposit_cents: priceOrNull(value(formData, "deposit")),
        taxes_details: nullable(value(formData, "taxes_details")),
        cancellation_policy: nullable(value(formData, "rate_cancellation")),
      })
      .select(
        "id, room_type_id, valid_from, valid_to, price_cents, minimum_nights, " +
        "included_guests, extra_guest_price_cents, cleaning_fee_cents, " +
        "taxes_details, deposit_cents, cancellation_policy",
      )
      .single();
    if (failure) setError(failure.message);
    else if (data) {
      setRates((current) => [...current, data as unknown as RatePeriod]);
    }
    setBusy(false);
  }

  // Elimina el periodo temporal seleccionado.
  async function deleteRate(rateId: string) {
    setBusy(true);
    setError("");
    const { error: failure } = await getSupabaseBrowserClient()
      .from("lodging_rate_periods")
      .delete()
      .eq("id", rateId);
    if (failure) setError(failure.message);
    else setRates((current) => current.filter((rate) => rate.id !== rateId));
    setBusy(false);
  }

  async function deleteRecord(table: "room_types" | "lodging_areas", id: string) {
    setBusy(true);
    setError("");
    const { error: failure } = await getSupabaseBrowserClient()
      .from(table)
      .delete()
      .eq("id", id);
    if (failure) setError(failure.message);
    else if (table === "room_types") {
      setRooms((current) => current.filter((room) => room.id !== id));
    } else {
      setAreas((current) => current.filter((area) => area.id !== id));
    }
    setBusy(false);
  }

  async function deleteRoom(room: Room) {
    if (!window.confirm(
      `¿Eliminar «${room.name}»? Esta acción también elimina sus tarifas y fotos. No se puede deshacer.`,
    )) return;
    setBusy(true);
    setError("");
    setNotice("");
    setRoomErrorId(null);
    try {
      const result = await deleteRoomTypeAction(serviceId, room.id);
      if (result.error) {
        setRoomErrorId(room.id);
        setError(result.error);
      } else {
        setRooms((current) => current.filter((item) => item.id !== room.id));
        setRates((current) => current.filter((rate) => rate.room_type_id !== room.id));
        setNotice(result.warning ?? `Se eliminó ${room.name}.`);
        router.refresh();
      }
    } catch {
      setRoomErrorId(room.id);
      setError("No se pudo eliminar la habitación. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel id="habitaciones">
        <h2>Habitaciones y unidades del hospedaje</h2>
        <p>
          Agrega cada tipo por separado (por ejemplo, doble y triple) y señala
          cuántas habitaciones o unidades iguales tienes de cada tipo.
        </p>
        <p role="status">{rooms.length} {rooms.length === 1 ? "tipo agregado" : "tipos agregados"}</p>
        {error && !roomErrorId && <p className="form-error" role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        <form action={saveRoom} id="agregar-habitacion">
          <h3>{rooms.length ? "Agregar otro tipo" : "Agregar la primera habitación o unidad"}</h3>
          <Field label="Nombre del tipo de habitación o unidad" name="room_name" required />
          <Field label="Descripción" name="room_description" multiline required />
          <label className="field">
            Unidad que reserva el cliente
            <select name="booking_unit" defaultValue="room">
              <option value="room">Habitación completa</option>
              <option value="bed">Cama individual</option>
              <option value="unit">Unidad completa</option>
              <option value="site">Parcela o sitio</option>
            </select>
          </label>
          <Field label="Capacidad de huéspedes por unidad" name="capacity" type="number" required />
          <Field label="Camas y distribución" name="beds_label" required />
          <Field label="Precio base por noche (USD)" name="price" type="number" required />
          <Field label="Cuántas unidades hay de este tipo" name="total_units" type="number" required />
          {!isOwner && <><Field label="Dormitorios" name="bedroom_count" type="number" />
          <Field label="Baños" name="bathroom_count" type="number" />
          <Field label="Área (m²)" name="area_m2" type="number" />
          {unitFields.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              name={`unit__${field.key}`}
              multiline={field.multiline}
            />
          ))}</>}
          <Button type="submit" disabled={busy}>Agregar tipo</Button>
        </form>
        <h3>Tipos agregados</h3>
        {rooms.map((room) => (
          <article className="lodging-item-card" key={room.id}>
            <div className="lodging-item-heading">
              <div className="lodging-item-summary">
                <h4>{room.name}</h4>
                <p>{room.capacity} personas · ${dollars(room.price_cents)} por noche</p>
              </div>
              <div className="lodging-item-actions">
                <a className="text-link" href={`/panel/servicios/${serviceId}/galeria`}>Administrar fotos</a>
                <Button tone="secondary" disabled={busy}
                  onClick={() => setEditingRoomId(editingRoomId === room.id ? null : room.id)}>
                  {editingRoomId === room.id ? "Cerrar edición" : `Editar ${room.name}`}
                </Button>
              </div>
            </div>
            {roomErrorId === room.id && error && <p className="form-error" role="alert">{error}</p>}
            {!isOwner && Object.entries(room.details ?? {}).map(([key, detail]) => (
              <small key={key}>{labelFor(key)}: {detail}</small>
            ))}
            {editingRoomId === room.id && (
              <form className="lodging-item-form" action={(formData) => updateRoom(room.id, formData)}>
                <h4>Datos de {room.name}</h4>
                <p className="muted">
                  Capacidad: {room.capacity} · Cantidad: {room.total_units}. Si la habitación
                  ya tiene reservas, puedes aumentar estos valores, pero no reducirlos.
                </p>
                <Field label="Nombre o tipo" name="room_name" defaultValue={room.name} required />
                <Field label="Descripción" name="room_description" multiline
                  defaultValue={room.description} required />
                <Field label="Capacidad de huéspedes por unidad" name="capacity" type="number"
                  defaultValue={room.capacity} required />
                <Field label="Cuántas unidades hay de este tipo" name="total_units" type="number"
                  defaultValue={room.total_units} required />
                <Field label="Camas y distribución" name="beds_label"
                  defaultValue={room.beds_label} required />
                <Field label="Precio base por noche (USD)" name="price" type="number"
                  defaultValue={dollars(room.price_cents)} required />
                {!isOwner && <><Field label="Dormitorios" name="bedroom_count" type="number"
                  defaultValue={room.bedroom_count} />
                <Field label="Baños" name="bathroom_count" type="number"
                  defaultValue={room.bathroom_count} />
                <Field label="Área (m²)" name="area_m2" type="number"
                  defaultValue={room.area_m2} />
                {unitFields.map((field) => (
                  <Field key={field.key} label={field.label} name={`unit__${field.key}`}
                    multiline={field.multiline} defaultValue={room.details?.[field.key] ?? ""} />
                ))}</>}
                <Button type="submit" disabled={busy}>Guardar cambios de habitación</Button>
              </form>
            )}
            <div className="lodging-rates">
              {rates.filter((rate) => rate.room_type_id === room.id).map((rate) => (
                <div className="lodging-rate-row" key={rate.id}>
                  <span>{rate.valid_from} al {rate.valid_to} · ${dollars(rate.price_cents)}</span>
                  <Button tone="quiet" disabled={busy} onClick={() => void deleteRate(rate.id)}>
                    Eliminar tarifa
                  </Button>
                </div>
              ))}
            </div>
            <form className="lodging-item-form" action={saveRate}>
              <input type="hidden" name="room_type_id" value={room.id} />
              <h4>Tarifa de temporada</h4>
              <Field label="Válida desde" name="valid_from" type="date" required />
              <Field label="Válida hasta" name="valid_to" type="date" required />
              <Field label="Precio por noche (USD)" name="season_price" type="number" required />
              {!isOwner && <><Field label="Estancia mínima (noches)" name="minimum_nights" type="number" />
              <Field label="Huéspedes incluidos" name="included_guests" type="number" />
              <Field label="Cargo por huésped extra (USD)" name="extra_guest_price" type="number" />
              <Field label="Limpieza (USD)" name="cleaning_fee" type="number" />
              <Field label="Depósito (USD)" name="deposit" type="number" />
              <Field label="Impuestos y cargos" name="taxes_details" multiline />
              <Field label="Cancelación para esta tarifa" name="rate_cancellation" multiline /></>}
              <Button type="submit" disabled={busy}>Guardar tarifa</Button>
            </form>
            <div className="lodging-item-footer">
              <Button tone="quiet" disabled={busy} onClick={() => void deleteRoom(room)}>
                Eliminar {room.name}
              </Button>
            </div>
          </article>
        ))}
      </Panel>
      <Panel id="areas">
        <h2>Áreas e instalaciones</h2>
        {areas.map((area) => (
          <div className="lodging-item-card" key={area.id}>
            <div className="lodging-item-heading">
              <div className="lodging-item-summary">
                <h3>{area.name}</h3>
                <p>{area.description ?? "Sin descripción"}</p>
              </div>
              <div className="lodging-item-actions">
                <a className="text-link" href={`/panel/servicios/${serviceId}/galeria`}>Administrar fotos</a>
                <Button tone="secondary" disabled={busy}
                  onClick={() => setEditingAreaId(editingAreaId === area.id ? null : area.id)}>
                  {editingAreaId === area.id ? "Cerrar edición" : "Editar área"}
                </Button>
              </div>
            </div>
            {!isOwner && Object.entries(area.details ?? {}).map(([key, detail]) => (
              <small key={key}>{labelFor(key)}: {detail}</small>
            ))}
            {editingAreaId === area.id && (
              <form className="lodging-item-form" action={(formData) => updateArea(area.id, formData)}>
                <Field label="Nombre del área" name="area_name"
                  defaultValue={area.name} required />
                <Field label="Descripción y servicios" name="area_description" multiline
                  defaultValue={area.description} />
                {!isOwner && <><Field label="Horario de uso" name="opening_hours"
                  defaultValue={area.opening_hours} />
                <Field label="Capacidad" name="area_capacity" type="number"
                  defaultValue={area.capacity} />
                <label className="checkbox-option">
                  <input type="checkbox" name="is_available" defaultChecked={area.is_available} />
                  Área disponible
                </label>
                <label className="checkbox-option">
                  <input type="checkbox" name="included_in_rate"
                    defaultChecked={area.included_in_rate ?? false} />
                  Incluida en la tarifa
                </label>
                <Field label="Cargo adicional (USD)" name="additional_price" type="number"
                  defaultValue={area.additional_price_cents === null
                    ? "" : dollars(area.additional_price_cents)} />
                <Field label="Acceso y restricciones" name="access_details" multiline
                  defaultValue={area.access_details} />
                {AREA_DETAIL_FIELDS.map(([key, label, multiline]) => (
                  <Field key={key} label={label} name={`area__${key}`}
                    multiline={multiline} defaultValue={area.details?.[key] ?? ""} />
                ))}</>}
                <Button type="submit" disabled={busy}>Guardar cambios del área</Button>
              </form>
            )}
            <div className="lodging-item-footer">
              <Button tone="quiet" disabled={busy}
                onClick={() => void deleteRecord("lodging_areas", area.id)}>
                Eliminar
              </Button>
            </div>
          </div>
        ))}
        <form action={saveArea}>
          <h3>Añadir área</h3>
          <Field label="Nombre del área" name="area_name" required />
          <Field label="Descripción y servicios" name="area_description" multiline />
          {!isOwner && <><Field label="Horario de uso" name="opening_hours" />
          <Field label="Capacidad" name="area_capacity" type="number" />
          <label className="checkbox-option">
            <input type="checkbox" name="included_in_rate" defaultChecked />
            Incluida en la tarifa
          </label>
          <Field label="Cargo adicional (USD)" name="additional_price" type="number" />
          <Field label="Acceso y restricciones" name="access_details" multiline />
          {AREA_DETAIL_FIELDS.map(([key, label, multiline]) => (
            <Field key={key} label={label} name={`area__${key}`} multiline={multiline} />
          ))}</>}
          <Button type="submit" disabled={busy}>Guardar área</Button>
        </form>
      </Panel>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  multiline = false,
  required = false,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  multiline?: boolean;
  required?: boolean;
  defaultValue?: string | number | null;
}) {
  return (
    <label className="field">
      {label}
      {multiline ? (
        <textarea name={name} rows={3} required={required} defaultValue={defaultValue ?? ""} />
      ) : (
        <input
          name={name}
          type={type}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "0.01" : undefined}
          required={required}
          defaultValue={defaultValue ?? ""}
        />
      )}
    </label>
  );
}

const AREA_DETAIL_FIELDS: Array<[string, string, boolean]> = [
  ["kind", "Tipo de espacio o servicio", false],
  ["privacy", "Privacidad o uso compartido", false],
  ["distance", "Distancia o tiempo desde la unidad", false],
  ["season", "Temporada o condiciones de uso", true],
  ["equipment", "Equipamiento y especificaciones", true],
  ["accessibility", "Accesibilidad del área", true],
  ["safety", "Seguridad y riesgos", true],
  ["restrictions", "Restricciones y notas", true],
];

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullable(input: string) {
  return input || null;
}

function numberOrNull(input: string) {
  return input ? Number(input) : null;
}

function priceOrNull(input: string) {
  const price = numberOrNull(input);
  return price === null ? null : Math.round(price * 100);
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

// Convierte claves de atributos para mostrarlas como etiquetas.
function labelFor(key: string) {
  return key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
