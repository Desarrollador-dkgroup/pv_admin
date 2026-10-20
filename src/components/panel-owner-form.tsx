"use client";

import { useState, useTransition } from "react";
import {
  createOwnerAccountAction,
  generateOwnerPasswordAction,
} from "@/app/panel/propietarios/actions";

type Option = { id: string; label: string | null };
type Item = { key: string; categoryId: string; typeId: string; count: number };
type Created = { email: string; password: string };

const HOSPEDAJE = "hospedaje";
const MAX_COUNT = 50;

// Botones − y + para elegir cuántos servicios de un tipo tiene la persona.
function Stepper({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  return (
    <div className="stepper">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Quitar uno"
      >
        −
      </button>
      <output aria-live="polite">{value}</output>
      <button
        type="button"
        onClick={() => onChange(Math.min(MAX_COUNT, value + 1))}
        disabled={value >= MAX_COUNT}
        aria-label="Añadir uno"
      >
        +
      </button>
    </div>
  );
}

// Alta de un propietario: nombre, correo, servicios que tendrá y contraseña temporal.
// El negocio no se elige aquí: el propietario lo define desde su propia cuenta.
export function CreateOwnerForm({
  categories,
  lodgingTypes,
}: {
  categories: Option[];
  lodgingTypes: Option[];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [busy, startTransition] = useTransition();

  const categoryLabel = (id: string) => categories.find((item) => item.id === id)?.label ?? id;
  const typeLabel = (id: string) => lodgingTypes.find((item) => item.id === id)?.label ?? id;
  const itemLabel = (item: Item) =>
    item.categoryId === HOSPEDAJE ? typeLabel(item.typeId) : categoryLabel(item.categoryId);

  const ready =
    name.trim().length >= 2 &&
    email.trim() !== "" &&
    password !== "" &&
    items.length > 0;

  function addItem() {
    setError("");
    setItems((list) => [
      ...list,
      {
        key: crypto.randomUUID(),
        categoryId: categories[0]?.id ?? "",
        typeId: lodgingTypes[0]?.id ?? "",
        count: 1,
      },
    ]);
  }

  function updateItem(itemKey: string, patch: Partial<Item>) {
    setItems((list) =>
      list.map((item) => (item.key === itemKey ? { ...item, ...patch } : item)),
    );
  }

  function removeItem(itemKey: string) {
    setItems((list) => list.filter((item) => item.key !== itemKey));
  }

  // Cambiar el correo invalida la contraseña, porque se generó para otro correo.
  function changeEmail(value: string) {
    setEmail(value);
    setPassword("");
  }

  function generate() {
    setError("");
    startTransition(async () => {
      const result = await generateOwnerPasswordAction({ name, email });
      if (result.error || !result.password) {
        setError(result.error || "No se pudo generar la contraseña.");
        return;
      }
      setPassword(result.password);
    });
  }

  function create() {
    setError("");
    const shownEmail = email.trim().toLowerCase();
    const shownPassword = password;
    startTransition(async () => {
      const result = await createOwnerAccountAction({
        name,
        email,
        password,
        services: items.map((item) => ({
          categoryId: item.categoryId,
          hospedajeTypeId: item.categoryId === HOSPEDAJE ? item.typeId : null,
          count: item.count,
        })),
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated({ email: shownEmail, password: shownPassword });
      setName("");
      setEmail("");
      setPassword("");
      setItems([]);
    });
  }

  return (
    <div className="owner-form">
      <section className="owner-section">
        <h3>1. Datos de la persona</h3>
        <div className="owner-grid">
          <label className="field">
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
          </label>
          <label className="field">
            Correo
            <input
              type="email"
              value={email}
              onChange={(event) => changeEmail(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="owner-section">
        <h3>2. Servicios que tendrá</h3>
        <p className="muted">
          Elige el tipo de servicio y cuántos tiene. La persona completará los datos de sus
          negocios al entrar a su cuenta.
        </p>

        <div className="owner-items">
          {items.map((item) => (
            <div className="owner-item" key={item.key}>
              <label className="field">
                Categoría
                <select
                  className="picker"
                  value={item.categoryId}
                  onChange={(event) =>
                    updateItem(item.key, {
                      categoryId: event.target.value,
                      typeId:
                        event.target.value === HOSPEDAJE && !item.typeId
                          ? (lodgingTypes[0]?.id ?? "")
                          : item.typeId,
                    })
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label ?? category.id}
                    </option>
                  ))}
                </select>
              </label>
              {item.categoryId === HOSPEDAJE && (
                <label className="field">
                  Tipo de hospedaje
                  <select
                    className="picker"
                    value={item.typeId}
                    onChange={(event) => updateItem(item.key, { typeId: event.target.value })}
                  >
                    {lodgingTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label ?? type.id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <div className="field owner-count">
                Cantidad
                <Stepper
                  value={item.count}
                  onChange={(count) => updateItem(item.key, { count })}
                />
              </div>
              <button
                type="button"
                className="text-button owner-item-remove"
                onClick={() => removeItem(item.key)}
              >
                Quitar
              </button>
            </div>
          ))}
        </div>

        <button type="button" className="button primary" onClick={addItem}>
          + Añadir servicio
        </button>

        {items.length > 0 && (
          <p className="owner-summary">
            {items.map((item) => `${item.count} × ${itemLabel(item)}`).join("  ·  ")}
          </p>
        )}
      </section>

      <section className="owner-section">
        <h3>3. Contraseña temporal</h3>
        <p className="muted">
          Genera la contraseña y entrégala junto con el correo. La persona deberá cambiarla al
          entrar.
        </p>
        <div className="owner-password-row">
          <button
            type="button"
            className="button secondary"
            onClick={generate}
            disabled={busy || !email.trim() || name.trim().length < 2}
          >
            Generar contraseña temporal
          </button>
          {password && <code className="owner-password">{password}</code>}
        </div>
      </section>

      {error && <p role="alert" className="form-error">{error}</p>}

      {created && (
        <div className="password-box">
          <p>
            Propietario creado para <b>{created.email}</b>. Entrega esta contraseña temporal. La
            persona deberá cambiarla al entrar.
          </p>
          <code>{created.password}</code>
        </div>
      )}

      <div className="owner-actions">
        <button
          type="button"
          className="button primary"
          onClick={create}
          disabled={busy || !ready}
        >
          {busy ? "Guardando…" : "Crear propietario"}
        </button>
        {!ready && (
          <small className="muted">
            Completa el nombre, el correo, la contraseña y al menos un servicio.
          </small>
        )}
      </div>
    </div>
  );
}
