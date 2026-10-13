import { Badge, Panel } from "@/components/ui";
import { Field } from "./field";

type Props = {
  fields: Record<string, string>;
  change: (key: string, value: string) => void;
};

// Calcula el descuento visible desde los dos importes, sin permitir edición contradictoria.
export function PromotionFields({ fields, change }: Props) {
  const regular = Number(fields.regular_price);
  const promotional = Number(fields.promotional_price);
  const percent =
    regular > 0 && promotional >= 0 && promotional <= regular
      ? Math.round(((regular - promotional) / regular) * 10000) / 100
      : null;
  return (
    <Panel>
      <h2>Una oferta clara para el viajero</h2>
      <div className="price-pair">
        {[
          { key: "regular_price", label: "Precio regular (USD)" },
          { key: "promotional_price", label: "Precio promocional (USD)" },
        ].map((definition) => (
          <Field
            key={definition.key}
            definition={{ ...definition, type: "number", required: true }}
            value={fields[definition.key] ?? ""}
            onChange={(value) => change(definition.key, value)}
          />
        ))}
      </div>
      <Badge>
        {percent === null ? "Revisa los precios" : `−${percent}% · calculado automáticamente`}
      </Badge>
      {[
        { key: "inclusions", label: "Incluye" },
        { key: "conditions", label: "Condiciones" },
        { key: "schedule", label: "Horarios" },
        { key: "exclusions", label: "No incluye" },
      ].map((definition) => (
        <Field
          key={definition.key}
          definition={definition}
          value={fields[definition.key] ?? ""}
          onChange={(value) => change(definition.key, value)}
        />
      ))}
    </Panel>
  );
}
