import type { FieldDefinition } from "@/data/forms";

// Comparte etiquetas, validación nativa y campos multilínea entre los formularios.
export function Field({
  definition,
  value,
  onChange,
}: {
  definition: FieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const { key, label, type = "text", required } = definition;
  return (
    <label className="field" htmlFor={`field-${key}`}>
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea
          id={`field-${key}`}
          value={value}
          rows={3}
          required={required}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={`field-${key}`}
          type={type}
          value={value}
          required={required}
          min={type === "number" ? 0 : undefined}
          step={type === "number" ? "0.01" : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
