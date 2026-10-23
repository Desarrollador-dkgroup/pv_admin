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
