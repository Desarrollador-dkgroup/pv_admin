"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { ActivityContent, ActivityAttraction } from "@/types/content";
import styles from "@/components/lodging-form-fields.module.css";

type Props = {
  activity: ActivityContent;
  onChange: (activity: ActivityContent) => void;
};

const DAYS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

export function ActivityFormFields({ activity, onChange }: Props) {
  const [newAttractionName, setNewAttractionName] = useState("");

  const handleScheduleChange = (day: string, field: string, value: string) => {
    const updated = { ...activity };
    if (!updated.schedule[day]) updated.schedule[day] = { from: "", to: "" };
    (updated.schedule[day] as Record<string, string>)[field] = value;
    onChange(updated);
  };

  const handleAttractionChange = (
    index: number,
    field: keyof ActivityAttraction,
    value: unknown
  ) => {
    const updated = { ...activity };
    (updated.attractions[index] as Record<string, unknown>)[field] = value;
    onChange(updated);
  };

  const addAttraction = () => {
    if (!newAttractionName.trim()) return;
    const updated = { ...activity };
    updated.attractions.push({
      name: newAttractionName,
      description: "",
      options: [],
      photos: [],
    });
    onChange(updated);
    setNewAttractionName("");
  };

  const removeAttraction = (index: number) => {
    const updated = { ...activity };
    updated.attractions.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className={styles.fieldSet}>
      <fieldset>
        <legend>Horario semanal</legend>
        <div className={styles.grid}>
          {DAYS.map((day) => (
            <div key={day} className={styles.row}>
              <label htmlFor={`schedule-${day}-from`}>
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </label>
              <input
                id={`schedule-${day}-from`}
                type="time"
                value={activity.schedule[day]?.from ?? ""}
                onChange={(e) => handleScheduleChange(day, "from", e.target.value)}
              />
              <span>a</span>
              <input
                type="time"
                value={activity.schedule[day]?.to ?? ""}
                onChange={(e) => handleScheduleChange(day, "to", e.target.value)}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Edad recomendada</legend>
        <div className={styles.row}>
          <label htmlFor="min-age">Desde los</label>
          <input
            id="min-age"
            type="number"
            min="0"
            max="120"
            value={activity.minAge ?? ""}
            onChange={(e) => {
              const updated = { ...activity };
              updated.minAge = e.target.value ? Number(e.target.value) : null;
              onChange(updated);
            }}
          />
          <span>años</span>
        </div>
      </fieldset>

      <fieldset>
        <legend>Lo que incluye</legend>
        <textarea
          name="activity_includes"
          placeholder="Separa items con saltos de línea: Guía certificado, Chaleco salvavidas..."
          value={activity.whatIncludes.join("\n")}
          onChange={(e) => {
            const updated = { ...activity };
            updated.whatIncludes = e.target.value
              .split("\n")
              .map((s) => s.trim())
              .filter((s) => s);
            onChange(updated);
          }}
        />
      </fieldset>

      <fieldset>
        <legend>Atracciones</legend>
        <div className={styles.list}>
          {activity.attractions.map((attraction, index) => (
            <div key={index} className={styles.item}>
              <div className={styles.row}>
                <label>Nombre:</label>
                <input
                  type="text"
                  value={attraction.name}
                  onChange={(e) =>
                    handleAttractionChange(index, "name", e.target.value)
                  }
                />
              </div>
              <div className={styles.row}>
                <label>Descripción (máx. 500 caracteres):</label>
                <textarea
                  value={attraction.description}
                  maxLength={500}
                  onChange={(e) =>
                    handleAttractionChange(
                      index,
                      "description",
                      e.target.value
                    )
                  }
                />
                <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  {attraction.description.length}/500
                </span>
              </div>
              <div className={styles.row}>
                <label>Opciones:</label>
                <textarea
                  value={attraction.options.join("\n")}
                  placeholder="Separa con saltos de línea"
                  onChange={(e) => {
                    const options = e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter((s) => s);
                    handleAttractionChange(index, "options", options);
                  }}
                />
              </div>
              <Button
                type="button"
                onClick={() => removeAttraction(index)}
                tone="secondary"
              >
                Eliminar atracción
              </Button>
            </div>
          ))}
        </div>

        <div className={styles.row}>
          <input
            type="text"
            placeholder="Nombre de nueva atracción"
            value={newAttractionName}
            onChange={(e) => setNewAttractionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAttraction();
              }
            }}
          />
          <Button type="button" onClick={addAttraction}>
            + Agregar atracción
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
