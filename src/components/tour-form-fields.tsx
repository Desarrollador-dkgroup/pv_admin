"use client";

import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui";

export type TourDeparture = { date: string; time: string };

export type TourDetails = {
  duration: string;
  language: string;
  meetingPointLabel: string;
  meetingPointUrl: string;
  departureMode: "weekly" | "dates" | "both";
  departures: TourDeparture[];
  maxGroupSize: number | null;
};

export const EMPTY_TOUR: TourDetails = {
  duration: "",
  language: "",
  meetingPointLabel: "",
  meetingPointUrl: "",
  departureMode: "weekly",
  departures: [],
  maxGroupSize: null,
};

const MODE_LABELS: Record<TourDetails["departureMode"], string> = {
  weekly: "Horario semanal",
  dates: "Fechas concretas",
  both: "Horario semanal y fechas concretas",
};

type Props = {
  tour: TourDetails;
  onChange: (tour: TourDetails) => void;
};

// Datos propios de un tour: duración, idioma, punto de encuentro, salidas y cupo.
export function TourFields({ tour, onChange }: Props) {
  const update = (changes: Partial<TourDetails>) => onChange({ ...tour, ...changes });
  const showDates = tour.departureMode !== "weekly";

  const updateDeparture = (idx: number, changes: Partial<TourDeparture>) => {
    update({
      departures: tour.departures.map((departure, i) =>
        i === idx ? { ...departure, ...changes } : departure),
    });
  };

  return (
    <>
      <label className="field">
        Duración
        <input
          value={tour.duration}
          onChange={(e) => update({ duration: e.target.value })}
          placeholder="Ej. 4 horas"
          maxLength={80}
        />
      </label>

      <label className="field">
        Idioma del guía
        <input
          value={tour.language}
          onChange={(e) => update({ language: e.target.value })}
          placeholder="Ej. Español e inglés"
          maxLength={80}
        />
      </label>

      <label className="field">
        Punto de encuentro
        <input
          value={tour.meetingPointLabel}
          onChange={(e) => update({ meetingPointLabel: e.target.value })}
          placeholder="Ej. Lobby del Hotel Central"
          maxLength={160}
        />
      </label>

      <label className="field">
        Enlace de Google Maps del punto de encuentro
        <input
          type="url"
          value={tour.meetingPointUrl}
          onChange={(e) => update({ meetingPointUrl: e.target.value })}
          placeholder="https://maps.app.goo.gl/..."
          maxLength={500}
        />
        <small style={{ color: "var(--muted)" }}>
          Al tocarlo en la app, el usuario abre este enlace en Google Maps.
        </small>
      </label>

      <label className="field">
        Salidas
        <select
          value={tour.departureMode}
          onChange={(e) => update({
            departureMode: e.target.value as TourDetails["departureMode"],
          })}
        >
          {(Object.keys(MODE_LABELS) as TourDetails["departureMode"][]).map((mode) => (
            <option key={mode} value={mode}>{MODE_LABELS[mode]}</option>
          ))}
        </select>
      </label>

      {showDates && (
        <div className="field">
          <label>Fechas de salida</label>
          {tour.departures.map((departure, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="date"
                value={departure.date}
                onChange={(e) => updateDeparture(idx, { date: e.target.value })}
              />
              <input
                type="time"
                value={departure.time}
                onChange={(e) => updateDeparture(idx, { time: e.target.value })}
              />
              <Button
                type="button"
                onClick={() => update({
                  departures: tour.departures.filter((_, i) => i !== idx),
                })}
                aria-label="Quitar fecha"
              >
                <X size={16} />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            onClick={() => update({
              departures: [...tour.departures, { date: "", time: "" }],
            })}
            style={{ width: "100%" }}
          >
            <Plus size={16} /> Agregar fecha de salida
          </Button>
        </div>
      )}

      <div className="field">
        <label className="checkbox-option">
          <input
            type="checkbox"
            checked={tour.maxGroupSize !== null}
            onChange={(e) => update({ maxGroupSize: e.target.checked ? 10 : null })}
          />
          Esta salida tiene cupo máximo
        </label>
        {tour.maxGroupSize !== null && (
          <input
            type="number"
            min={1}
            max={500}
            value={tour.maxGroupSize}
            onChange={(e) => update({ maxGroupSize: Math.max(1, Number(e.target.value) || 1) })}
          />
        )}
      </div>
    </>
  );
}
