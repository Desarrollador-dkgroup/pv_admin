"use client";

import { useState } from "react";

// Lista desplegable para respuestas de opción única, con "Sin definir" como valor inicial.
export function ChoiceField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: unknown;
  options: string[];
}) {
  const initial = value == null ? "" : String(value);
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={options.includes(initial) ? initial : ""}>
        <option value="">Sin definir</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

const RECEPTION_PATTERN = /^(\d{2}:\d{2}) a (\d{2}:\d{2})$/;
type ReceptionMode = "no" | "24" | "horario";

// Distingue si lo guardado es 24 horas, un horario o nada.
function receptionModeOf(saved: string): ReceptionMode {
  if (saved === "24 horas") return "24";
  if (RECEPTION_PATTERN.test(saved)) return "horario";
  return "no";
}

// Primero pregunta si hay recepción; puede ser 24 horas o un horario desde-hasta.
export function ReceptionHoursField({ initial }: { initial: unknown }) {
  const saved = typeof initial === "string" ? initial : "";
  const match = RECEPTION_PATTERN.exec(saved);
  const [mode, setMode] = useState<ReceptionMode>(receptionModeOf(saved));
  return (
    <>
      <label className="field">
        ¿Mantiene horario de recepción?
        <select
          name="reception_mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as ReceptionMode)}
        >
          <option value="no">No</option>
          <option value="24">Sí, recepción 24 horas</option>
          <option value="horario">Sí, en un horario</option>
        </select>
      </label>
      {mode === "horario" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label className="field">
            Desde
            <input name="reception_from" type="time" defaultValue={match?.[1] ?? ""} />
          </label>
          <label className="field">
            Hasta
            <input name="reception_to" type="time" defaultValue={match?.[2] ?? ""} />
          </label>
        </div>
      )}
    </>
  );
}

// Si se permiten eventos aparece el campo para su reglamento; si no, no se envía.
export function EventsPolicyField({ policy, rules }: { policy: unknown; rules: unknown }) {
  const [allowed, setAllowed] = useState(policy === "Sí");
  return (
    <>
      <label className="field">
        ¿Se permiten eventos?
        <select
          name="events_policy"
          value={allowed ? "Sí" : "No"}
          onChange={(event) => setAllowed(event.target.value === "Sí")}
        >
          <option value="No">No</option>
          <option value="Sí">Sí</option>
        </select>
      </label>
      {allowed && (
        <label className="field">
          Reglamento para eventos
          <textarea
            name="detail__events_rules"
            rows={3}
            defaultValue={typeof rules === "string" ? rules : ""}
          />
        </label>
      )}
    </>
  );
}

export const MINIBAR_LABEL = "Minibar (frituras, bebidas y productos de la nevera)";

// Lo que suele incluir un apartamento; "Otro" permite escribir lo que falte.
export const APARTMENT_INCLUSIONS = [
  "Camas",
  "Toallas",
  "Sábanas",
  "Servicio de limpieza",
  "Cocina equipada",
  "Aire acondicionado",
  "Wi-Fi",
  "Lavadora",
  "Parqueo",
  MINIBAR_LABEL,
];

export type ApartmentType = {
  id: string;
  name: string;
  quantity: string;
  includes: string[];
  otherOpen: boolean;
  others: string[];
  minibar: string;
};

// Convierte el JSON guardado en filas editables; valores desconocidos quedan vacíos.
export function readApartmentTypes(value: unknown): ApartmentType[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: unknown, index: number) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const saved = Array.isArray(row.includes) ? row.includes.map(String) : [];
    const others = saved.filter((entry) => !APARTMENT_INCLUSIONS.includes(entry));
    return {
      id: `saved-${index}`,
      name: typeof row.name === "string" ? row.name : "",
      quantity: row.quantity == null ? "" : String(row.quantity),
      includes: saved.filter((entry) => APARTMENT_INCLUSIONS.includes(entry)),
      otherOpen: others.length > 0,
      others,
      minibar:
        row.minibar_included === true ? "Sí" : row.minibar_included === false ? "No" : "",
    };
  });
}

// Lista de tipos de apartamento: nombre, cantidad, inclusiones y minibar con regla de compra.
export function ApartmentTypesField({ initial }: { initial: ApartmentType[] }) {
  const [types, setTypes] = useState<ApartmentType[]>(initial);

  function patch(id: string, change: (type: ApartmentType) => ApartmentType) {
    setTypes((current) => current.map((type) => (type.id === id ? change(type) : type)));
  }

  function toggleInclude(id: string, item: string, checked: boolean) {
    patch(id, (type) => ({
      ...type,
      includes: checked
        ? [...type.includes, item]
        : type.includes.filter((entry) => entry !== item),
    }));
  }

  function toggleOther(id: string, checked: boolean) {
    patch(id, (type) => ({
      ...type,
      otherOpen: checked,
      others: checked ? type.others : [],
    }));
  }

  function setOther(id: string, index: number, value: string) {
    patch(id, (type) => ({
      ...type,
      others: type.others.map((entry, position) => (position === index ? value : entry)),
    }));
  }

  function addOther(id: string) {
    patch(id, (type) => ({ ...type, others: [...type.others, ""] }));
  }

  function removeOther(id: string, index: number) {
    patch(id, (type) => ({
      ...type,
      others: type.others.filter((_, position) => position !== index),
    }));
  }

  function add() {
    setTypes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: "",
        includes: [],
        otherOpen: false,
        others: [],
        minibar: "",
      },
    ]);
  }

  function remove(id: string) {
    setTypes((current) => current.filter((type) => type.id !== id));
  }

  const payload = types.map((type) => ({
    name: type.name,
    quantity: Number(type.quantity) || 0,
    includes: [...type.includes, ...type.others.map((entry) => entry.trim()).filter(Boolean)],
    minibar_included: type.includes.includes(MINIBAR_LABEL)
      ? type.minibar === "Sí"
        ? true
        : type.minibar === "No"
          ? false
          : null
      : null,
  }));

  return (
    <fieldset className="field">
      <legend>Tipos de apartamento</legend>
      {types.map((type, index) => (
        <div
          key={type.id}
          style={{ display: "grid", gap: 10, padding: 12, border: "1px solid #d4d4d8" }}
        >
          <strong>Tipo {index + 1}</strong>
          <label className="field">
            Nombre del tipo
            <input
              value={type.name}
              onChange={(event) => patch(type.id, (t) => ({ ...t, name: event.target.value }))}
            />
          </label>
          <label className="field">
            Cantidad disponible
            <input
              type="number"
              min={0}
              value={type.quantity}
              onChange={(event) =>
                patch(type.id, (t) => ({ ...t, quantity: event.target.value }))
              }
            />
          </label>
          <div className="field">
            <span>Qué incluye el apartamento</span>
            {APARTMENT_INCLUSIONS.map((item) => (
              <label key={item} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={type.includes.includes(item)}
                  onChange={(event) => toggleInclude(type.id, item, event.target.checked)}
                />
                {item}
              </label>
            ))}
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={type.otherOpen}
                onChange={(event) => toggleOther(type.id, event.target.checked)}
              />
              Otro
            </label>
          </div>
          {type.includes.includes(MINIBAR_LABEL) && (
            <label className="field">
              ¿El minibar está incluido en la compra del apartamento?
              <select
                value={type.minibar}
                onChange={(event) =>
                  patch(type.id, (t) => ({ ...t, minibar: event.target.value }))
                }
              >
                <option value="">Sin definir</option>
                <option value="Sí">Sí, incluido</option>
                <option value="No">No, se paga aparte</option>
              </select>
            </label>
          )}
          {type.otherOpen && (
            <div style={{ display: "grid", gap: 8 }}>
              {type.others.map((entry, position) => (
                <div key={position} style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ flex: 1 }}
                    placeholder="Escribe lo que incluye"
                    value={entry}
                    onChange={(event) => setOther(type.id, position, event.target.value)}
                  />
                  <button type="button" onClick={() => removeOther(type.id, position)}>
                    Quitar
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addOther(type.id)}>
                + Añadir otro
              </button>
            </div>
          )}
          <button type="button" onClick={() => remove(type.id)}>
            Quitar tipo
          </button>
        </div>
      ))}
      <button type="button" onClick={add}>
        + Añadir tipo de apartamento
      </button>
      <input type="hidden" name="detail__apartment_types" value={JSON.stringify(payload)} />
    </fieldset>
  );
}
