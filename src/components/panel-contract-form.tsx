"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  rejectSignedContractAction,
  saveContractAction,
} from "@/app/panel/contratos/actions";
import { ConfirmSubmit, Panel } from "@/components/ui";
import { formatCents } from "@/lib/panel-format";
import {
  CONTRACT_FIELDS,
  CONTRACT_PLACEHOLDERS,
  DEFAULT_CONTRACT_BODY,
  DEFAULT_CONTRACT_TITLE,
  contractValuesFor,
  missingContractKeys,
  renderContract,
  renderContractParts,
  type ContractValues,
} from "@/lib/panel-contracts";
import { previewPromotion } from "@/lib/promotion-commission";

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
  // Valores de los datos del contrato sin columna propia (CONTRACT_FIELDS).
  fields: Record<string, string>;
  // Fecha de emisión ya formateada en el servidor; la misma usa la impresión.
  dateLabel: string;
  version: number;
};

// Campos de texto de los datos legales, con el nombre que espera la acción.
const LEGAL_FIELDS = [
  { key: "legalName", name: "legal_name", label: "Razón social", type: "text" },
  { key: "taxId", name: "tax_id", label: "RUC y DV", type: "text" },
  { key: "legalRepresentative", name: "legal_representative", label: "Representante legal", type: "text" },
  { key: "contactEmail", name: "contact_email", label: "Correo para avisos", type: "email" },
  { key: "legalAddress", name: "legal_address", label: "Dirección legal", type: "text" },
] as const;

// Condiciones comerciales con la explicación que muestra el diseño.
const TERMS = [
  { key: "baseCommissionPct", name: "base_commission_pct", label: "Comisión base (%)",
    help: "Lo que cobra la plataforma por cada reserva.", max: 99.99 },
  { key: "discountLimitPct", name: "discount_limit_pct", label: "Límite de descuento (%)",
    help: "Hasta aquí la comisión no cambia.", max: 99.99 },
  { key: "targetProfitUsd", name: "target_profit_usd", label: "Ganancia objetivo por reserva (USD)",
    help: "Lo mínimo que gana la plataforma si el descuento supera el límite.", max: undefined },
  { key: "commissionCapPct", name: "commission_cap_pct", label: "Tope de comisión (%)",
    help: "La comisión nunca pasa de este valor.", max: 99.99 },
] as const;

const KNOWN_KEYS = new Set<string>(CONTRACT_PLACEHOLDERS.map((item) => item.key));

// Generador de contratos: datos, condiciones, documento y emisión, con vista previa en vivo.
export function ContractForm({ initial }: { initial: ContractFormValues }) {
  const [state, action, pending] = useActionState(saveContractAction, { error: "" });
  const [values, setValues] = useState(initial);
  const [fields, setFields] = useState(initial.fields);
  const [body, setBody] = useState(initial.templateBody);
  const [simPrice, setSimPrice] = useState(100);
  const [simDiscount, setSimDiscount] = useState(40);
  const template = useRef<HTMLTextAreaElement>(null);

  // Los números vacíos no se muestran como «NaN»: quedan en blanco y cuentan como faltantes.
  const blankIfNaN = (value: number) => (Number.isFinite(value) ? String(value) : "");
  const previewValues: ContractValues = {
    ...contractValuesFor({
      legal_name: values.legalName || null,
      tax_id: values.taxId || null,
      legal_representative: values.legalRepresentative || null,
      legal_address: values.legalAddress || null,
      contact_email: values.contactEmail || null,
      starts_on: values.startsOn || null,
      ends_on: values.endsOn || null,
      base_commission_pct: values.baseCommissionPct,
      discount_limit_pct: values.discountLimitPct,
      target_profit_cents: Math.round(values.targetProfitUsd * 100),
      commission_cap_pct: values.commissionCapPct,
      contract_fields: fields,
    }, values.businessName, initial.dateLabel),
    comision_base: blankIfNaN(values.baseCommissionPct),
    limite_descuento: blankIfNaN(values.discountLimitPct),
    tope_comision: blankIfNaN(values.commissionCapPct),
    ganancia_objetivo: Number.isFinite(values.targetProfitUsd)
      ? formatCents(Math.round(values.targetProfitUsd * 100))
      : "",
  };

  // Marcadores escritos a mano que no existen, y datos usados que están vacíos.
  const used = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
  const unknown = [...new Set(used.filter((key) => !KNOWN_KEYS.has(key)))];
  const empty = missingContractKeys(body, previewValues)
    .filter((key) => KNOWN_KEYS.has(key))
    .map((key) => CONTRACT_PLACEHOLDERS.find((item) => item.key === key)?.label ?? key);
  const fieldsReady = CONTRACT_FIELDS.every((field) => Boolean(fields[field.key]?.trim()));

  const simulation = previewPromotion(Math.round(simPrice * 100), simDiscount, {
    baseCommissionPct: values.baseCommissionPct,
    discountLimitPct: values.discountLimitPct,
    targetProfitCents: Math.round(values.targetProfitUsd * 100),
    commissionCapPct: values.commissionCapPct,
  });

  // Inserta un dato en la posición del cursor de la plantilla.
  function insertPlaceholder(key: string) {
    const area = template.current;
    const token = `{{${key}}}`;
    if (!area) {
      setBody((current) => current + token);
      return;
    }
    const start = area.selectionStart ?? body.length;
    const end = area.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const legalReady = Boolean(values.legalName && values.taxId && values.legalRepresentative);
  const termsReady = values.commissionCapPct >= values.baseCommissionPct;
  const documentReady = !unknown.length && !empty.length && body.trim().length > 0;

  return (
    <form action={action}>
      <input type="hidden" name="business_id" value={initial.businessId} />
      <ol className="stepper-line" aria-label="Pasos del contrato">
        <li data-step="1" className={legalReady ? "done" : "current"}>Datos del negocio</li>
        <li data-step="2" className={termsReady && fieldsReady ? "done" : "current"}>Condiciones</li>
        <li data-step="3" className={documentReady ? "done" : "current"}>Documento</li>
        <li data-step="4" className={legalReady && termsReady && documentReady ? "current" : ""}>
          Revisar y emitir
        </li>
      </ol>

      <div className="contract-layout">
        <div className="contract-main">
          <Panel id="datos">
            <h2>1 · Datos legales del negocio</h2>
            <p className="contract-hint">Aparecen en el encabezado y en las cláusulas del documento.</p>
            <label className="field">
              Nombre comercial
              <input className="contract-readonly-value" value={values.businessName} readOnly
                aria-readonly="true" />
              <small className="muted">Viene de la ficha del negocio.</small>
            </label>
            <div className="form-grid">
              {LEGAL_FIELDS.map((field) => (
                <label className="field" key={field.name}>
                  {field.label}
                  <input name={field.name} type={field.type} value={values[field.key]}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} />
                </label>
              ))}
            </div>
          </Panel>

          <Panel id="condiciones">
            <h2>2 · Condiciones comerciales</h2>
            <p className="contract-hint">
              Se aplican a las promociones del negocio cuando el contrato está emitido.
            </p>
            <label className="field">
              Título del contrato
              <input name="title" required value={values.title}
                onChange={(e) => setValues({ ...values, title: e.target.value })} />
            </label>
            <div className="form-grid">
              {TERMS.map((term) => (
                <label className="field" key={term.name}>
                  {term.label}
                  <input name={term.name} type="number" step="0.01" min="0" max={term.max} required
                    value={Number.isFinite(values[term.key]) ? values[term.key] : ""}
                    onChange={(e) => setValues({
                      ...values,
                      [term.key]: e.target.value === "" ? Number.NaN : Number(e.target.value),
                    })} />
                  <small className="muted">{term.help}</small>
                </label>
              ))}
            </div>
            {!termsReady && (
              <p className="form-error" role="alert">
                El tope de comisión no puede ser menor que la comisión base.
              </p>
            )}
            <h3>Vigencia</h3>
            <div className="form-row">
              <label className="field">
                Fecha de inicio
                <input name="starts_on" type="date" value={values.startsOn}
                  onChange={(e) => setValues({ ...values, startsOn: e.target.value })} />
              </label>
              <label className="field">
                Fecha de fin
                <input name="ends_on" type="date" value={values.endsOn}
                  onChange={(e) => setValues({ ...values, endsOn: e.target.value })} />
              </label>
            </div>
            <div className="simulator">
              <h3>Simulador</h3>
              <p className="contract-hint">Prueba cómo cambia la comisión con un descuento.</p>
              <div className="form-row">
                <label className="field">
                  Precio regular (USD)
                  <input type="number" min="1" step="0.01" value={simPrice}
                    onChange={(e) => setSimPrice(Number(e.target.value) || 0)} />
                </label>
                <label className="field">
                  Descuento de la promoción (%)
                  <input type="range" min="0" max="90" value={simDiscount}
                    onChange={(e) => setSimDiscount(Number(e.target.value))} />
                  <small className="muted">{simDiscount} %</small>
                </label>
              </div>
              <div className="sim-results">
                <div><small>Precio final</small><b>{formatCents(simulation.finalPriceCents)}</b></div>
                <div><small>Comisión aplicada</small>
                  <b>{Number.isFinite(simulation.commissionPct)
                    ? `${simulation.commissionPct.toFixed(1)} %` : "—"}</b></div>
                <div><small>Ganancia</small><b>{formatCents(simulation.profitCents)}</b></div>
              </div>
              <p className="contract-hint">
                {simulation.blocked
                  ? `Con este descuento la comisión pasaría del tope: el negocio no podría guardarlo (máximo ${simulation.maxDiscountPct} %).`
                  : simulation.exceedsLimit
                    ? `El ${simDiscount} % supera el límite del ${values.discountLimitPct} %: la comisión sube para conservar ${formatCents(Math.round(values.targetProfitUsd * 100))} por reserva.`
                    : `Hasta el ${values.discountLimitPct} % la comisión se queda en ${values.baseCommissionPct} %.`}
              </p>
            </div>
          </Panel>

          <Panel id="datos-contrato">
            <h2>3 · Datos del contrato</h2>
            <p className="contract-hint">
              Cada dato aparece en la cláusula que le corresponde. Revisa los valores por defecto.
            </p>
            {[...new Set(CONTRACT_FIELDS.map((field) => field.group))].map((group) => (
              <div key={group} className="stack compact">
                <h3>{group}</h3>
                <div className="form-grid">
                  {CONTRACT_FIELDS.filter((field) => field.group === group).map((field) => (
                    <label className="field" key={field.key}>
                      {field.label}
                      {field.kind === "select" ? (
                        <select name={`field_${field.key}`} value={fields[field.key] ?? ""}
                          onChange={(e) => setFields({ ...fields, [field.key]: e.target.value })}>
                          {field.options?.map((option) => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      ) : field.kind === "textarea" ? (
                        <textarea name={`field_${field.key}`} rows={3} value={fields[field.key] ?? ""}
                          onChange={(e) => setFields({ ...fields, [field.key]: e.target.value })} />
                      ) : (
                        <input name={`field_${field.key}`}
                          type={field.kind === "number" ? "number" : "text"}
                          min={field.kind === "number" ? "0" : undefined}
                          step={field.kind === "number" ? "any" : undefined}
                          value={fields[field.key] ?? ""}
                          onChange={(e) => setFields({ ...fields, [field.key]: e.target.value })} />
                      )}
                      {field.help && <small className="muted">{field.help}</small>}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {!fieldsReady && (
              <p className="form-error" role="alert">Completa todos los datos del contrato.</p>
            )}
          </Panel>

          <Panel id="documento">
            <h2>4 · Documento</h2>
            <p className="contract-hint">Inserta datos con un clic en la posición del cursor.</p>
            {initial.status === "draft" && (
              <div className="stack compact">
                <button type="button" className="button quiet small"
                  onClick={() => {
                    setBody(DEFAULT_CONTRACT_BODY);
                    setValues({ ...values, title: DEFAULT_CONTRACT_TITLE });
                  }}>
                  Usar la plantilla nueva
                </button>
                <small className="muted">
                  Reemplaza el texto actual por la plantilla vigente. Los datos que ya llenaste se conservan.
                </small>
              </div>
            )}
            <div className="chip-row">
              {CONTRACT_PLACEHOLDERS.map((item) => (
                <button type="button" key={item.key} className="chip insert-chip"
                  onClick={() => insertPlaceholder(item.key)}>
                  + {item.label}
                </button>
              ))}
            </div>
            <label className="field">
              Texto del contrato
              <textarea ref={template} name="template_body" rows={18} required value={body}
                onChange={(e) => setBody(e.target.value)} />
            </label>
            {unknown.length > 0 && (
              <div className="callout danger" role="alert">
                <strong>Marcadores desconocidos</strong>
                <span>{unknown.map((key) => `{{${key}}}`).join(", ")} no existen. Usa los botones de arriba.</span>
              </div>
            )}
            {empty.length > 0 && (
              <div className="callout warning">
                <strong>Faltan datos</strong>
                <span>{empty.join(", ")} todavía no tienen valor.</span>
              </div>
            )}
            {documentReady && (
              <div className="callout success">
                <strong>Todo listo para revisar</strong>
                <span>Los datos del contrato tienen valor y no hay marcadores desconocidos.</span>
              </div>
            )}
          </Panel>
        </div>
        <aside className="contract-side">
          <Panel>
            <div className="section-heading">
              <h2>Vista previa</h2>
              <span className="badge tone-success">Se actualiza al escribir</span>
            </div>
            <button type="button" className="button secondary small"
              onClick={() => window.print()}>
              Vista de impresión (PDF)
            </button>
            <div className="contract-paper">
              <header>
                <span className="paper-logo">PV</span>
                <div>
                  <b>Panamá Viajero</b>
                  <small>Versión {initial.version} · {initial.dateLabel}</small>
                </div>
              </header>
              <h3>{values.title}</h3>
              <pre className="contract-preview">
                {renderContractParts(body, previewValues).map((part, index) => (
                  part.kind === "text" ? (
                    <span key={index}>{part.text}</span>
                  ) : (
                    <span key={index} className={part.kind === "data" ? "contract-data" : "contract-missing"}>
                      {part.text}
                    </span>
                  )
                ))}
              </pre>
            </div>
            {/* Hoja de impresión: solo se ve al imprimir, en negro y sin la vista previa del panel. */}
            <article className="contract-print contract-print-live contract-paper" aria-hidden="true">
              <header>
                <span className="paper-logo">PV</span>
                <div>
                  <b>Panamá Viajero</b>
                  <small>Versión {initial.version}</small>
                </div>
              </header>
              <h1>{values.title}</h1>
              <pre>{renderContract(body, previewValues)}</pre>
            </article>
          </Panel>
        </aside>
      </div>

      {state.error && <p className="form-error" role="alert">{state.error}</p>}

      <footer className="sticky-actions">
        <span className="muted">
          Borrador · no visible para el negocio. Al emitirlo recibe un aviso.
        </span>
        <Link className="button quiet" href="/panel/contratos">Cancelar</Link>
        <button type="submit" name="status" value="draft" className="button secondary"
          disabled={pending}>
          {pending ? "Guardando…" : "Guardar borrador"}
        </button>
        <ConfirmSubmit tone="primary" name="status" value="issued"
          disabled={pending || !termsReady || !fieldsReady || unknown.length > 0 || empty.length > 0}
          confirm={{
            title: `¿Emitir el contrato a ${values.businessName}?`,
            body: "El negocio recibirá un aviso y lo verá en «Mi contrato». Las condiciones " +
              "empiezan a aplicarse a sus promociones. Para cambiarlo después tendrás que " +
              "crear una nueva versión.",
            confirmLabel: "Emitir contrato",
          }}>
          Emitir contrato
        </ConfirmSubmit>
      </footer>
    </form>
  );
}

// El equipo rechaza la copia firmada con un motivo que verá el negocio.
export function RejectSignedContractForm({ businessId }: { businessId: string }) {
  const [state, action, pending] = useActionState(rejectSignedContractAction, { error: "" });
  return (
    <form action={action} className="review-form">
      <input type="hidden" name="business_id" value={businessId} />
      <label className="field">
        Motivo del rechazo
        <textarea name="rejection_reason" rows={3} required
          placeholder="Ej. Falta la firma en la página 2." />
        <small className="muted">El negocio lo verá y podrá subir otra copia.</small>
      </label>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <button type="submit" className="button secondary" disabled={pending}>
        {pending ? "Enviando…" : "Rechazar y pedir otra copia"}
      </button>
    </form>
  );
}
