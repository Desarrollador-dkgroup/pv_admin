"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveContractAction } from "@/app/panel/contratos/actions";
import { Button, Panel } from "@/components/ui";
import { formatCents } from "@/lib/panel-format";
import {
  CONTRACT_PLACEHOLDERS,
  formatContractDate,
  renderContract,
  type ContractValues,
} from "@/lib/panel-contracts";

export type ContractFormValues = {
  businessId: string;
  businessName: string;
  title: string;
  templateBody: string;
  status: "draft" | "issued";
  baseCommissionPct: number;
  discountLimitPct: number;
  targetProfitUsd: number;
  commissionCapPct: number;
  legalName: string;
  taxId: string;
  legalRepresentative: string;
  legalAddress: string;
  contactEmail: string;
  startsOn: string;
  endsOn: string;
  // Fecha de emisión ya formateada en el servidor; la misma usa la impresión.
  dateLabel: string;
};

// Campos de texto de los datos legales, con el nombre que espera la acción.
const LEGAL_FIELDS = [
  { key: "legalName", name: "legal_name", label: "Razón social", type: "text" },
  { key: "taxId", name: "tax_id", label: "RUC y DV", type: "text" },
  { key: "legalRepresentative", name: "legal_representative", label: "Representante legal", type: "text" },
  { key: "contactEmail", name: "contact_email", label: "Correo para avisos", type: "email" },
  { key: "legalAddress", name: "legal_address", label: "Dirección legal", type: "text" },
] as const;

// Formulario del contrato con vista previa del texto ya llenado.
export function ContractForm({ initial }: { initial: ContractFormValues }) {
  const [state, action, pending] = useActionState(saveContractAction, { error: "" });
  const [values, setValues] = useState(initial);
  const [body, setBody] = useState(initial.templateBody);

  const previewValues: ContractValues = {
    razon_social: values.legalName,
    ruc: values.taxId,
    representante: values.legalRepresentative,
    direccion: values.legalAddress,
    vigencia_inicio: formatContractDate(values.startsOn),
    vigencia_fin: formatContractDate(values.endsOn),
    negocio: values.businessName,
    comision_base: String(values.baseCommissionPct),
    limite_descuento: String(values.discountLimitPct),
    ganancia_objetivo: formatCents(Math.round(values.targetProfitUsd * 100)),
    tope_comision: String(values.commissionCapPct),
    fecha: initial.dateLabel,
  };

  return (
    <form action={action}>
      <input type="hidden" name="business_id" value={initial.businessId} />
      <div className="contract-layout">
      <div className="contract-main">
      <Panel>
        <h2>Datos legales</h2>
        <p className="contract-hint">Aparecen en el encabezado y en las cláusulas del documento.</p>
        {LEGAL_FIELDS.map((field) => (
          <label className="field" key={field.name}>
            {field.label}
            <input name={field.name} type={field.type} value={values[field.key]}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} />
          </label>
        ))}
      </Panel>

      <Panel>
        <h2>Vigencia</h2>
        <div className="form-row">
          <label className="field">
            Inicio
            <input name="starts_on" type="date" value={values.startsOn}
              onChange={(e) => setValues({ ...values, startsOn: e.target.value })} />
          </label>
          <label className="field">
            Fin
            <input name="ends_on" type="date" value={values.endsOn}
              onChange={(e) => setValues({ ...values, endsOn: e.target.value })} />
          </label>
        </div>
      </Panel>

      <Panel>
        <h2>Condiciones</h2>
        <label className="field">
          Título
          <input name="title" required value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })} />
        </label>
        <div className="form-row">
          <label className="field">
            Comisión base (%)
            <input name="base_commission_pct" type="number" step="0.01" min="0" max="99.99"
              required value={values.baseCommissionPct}
              onChange={(e) => setValues({ ...values, baseCommissionPct: Number(e.target.value) })} />
          </label>
          <label className="field">
            Límite de descuento (%)
            <input name="discount_limit_pct" type="number" step="0.01" min="0" max="99.99"
              required value={values.discountLimitPct}
              onChange={(e) => setValues({ ...values, discountLimitPct: Number(e.target.value) })} />
          </label>
        </div>
        <div className="form-row">
          <label className="field">
            Ganancia objetivo por reserva (USD)
            <input name="target_profit_usd" type="number" step="0.01" min="0" required
              value={values.targetProfitUsd}
              onChange={(e) => setValues({ ...values, targetProfitUsd: Number(e.target.value) })} />
          </label>
          <label className="field">
            Tope de comisión (%)
            <input name="commission_cap_pct" type="number" step="0.01" min="0" max="99.99"
              required value={values.commissionCapPct}
              onChange={(e) => setValues({ ...values, commissionCapPct: Number(e.target.value) })} />
          </label>
        </div>
        <label className="field">
          Estado
          <select name="status" value={values.status}
            onChange={(e) => setValues({ ...values, status: e.target.value as "draft" | "issued" })}>
            <option value="draft">Borrador (no visible para el propietario)</option>
            <option value="issued">Emitido (el propietario puede verlo y firmarlo)</option>
          </select>
        </label>
      </Panel>

      <Panel>
        <h2>Plantilla</h2>
        <p className="muted">
          Marcadores disponibles: {CONTRACT_PLACEHOLDERS.map((item) => `{{${item.key}}}`).join(", ")}
        </p>
        <label className="field">
          Texto del contrato
          <textarea name="template_body" rows={16} required value={body}
            onChange={(e) => setBody(e.target.value)} />
        </label>
      </Panel>

      </div>
      <aside className="contract-side">
        <Panel>
          <h2>Vista previa</h2>
          <p className="contract-hint">Así se verá el documento impreso.</p>
          <pre className="contract-preview">{renderContract(body, previewValues)}</pre>
        </Panel>
      </aside>
      </div>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <footer className="sticky-actions">
        <Link className="button quiet" href="/panel/contratos">Cancelar</Link>
        <Button type="submit" tone="primary" disabled={pending}>
          {pending ? "Guardando..." : "Guardar contrato"}
        </Button>
      </footer>
    </form>
  );
}
