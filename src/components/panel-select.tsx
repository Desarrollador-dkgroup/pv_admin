"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type OptionItem = { value: string; label: string; disabled: boolean };
type ChangeLike = { target: { value: string } };

// Texto visible de un nodo (para la etiqueta de cada opción).
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

// Lee las <option> hijas igual que lo haría un <select> nativo.
function readOptions(children: ReactNode): OptionItem[] {
  const items: OptionItem[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string; children?: ReactNode; disabled?: boolean }>(child)) {
      return;
    }
    const label = textOf(child.props.children).trim();
    const value = child.props.value !== undefined ? String(child.props.value) : label;
    items.push({ value, label, disabled: Boolean(child.props.disabled) });
  });
  return items;
}

// Selector con diseño propio del panel. Recibe las mismas <option> que un <select>, así que
// se usa igual: value/defaultValue, onChange y name. El valor viaja en un campo oculto, por lo
// que los formularios GET y las acciones del servidor siguen funcionando.
export function PanelSelect({
  name,
  children,
  value,
  defaultValue = "",
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  name?: string;
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (event: ChangeLike) => void;
  disabled?: boolean;
  "aria-label"?: string;
  // Se aceptan para no cambiar los usos existentes; el navegador no los aplica aquí.
  required?: boolean;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = readOptions(children);
  const current = value ?? internal;
  const selected = options.find((option) => option.value === current);
  const shown = selected?.label || options[0]?.label || "";

  // Cierra al tocar fuera del selector o al pulsar Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: string) => {
    if (value === undefined) setInternal(next);
    setOpen(false);
    onChange?.({ target: { value: next } });
  };

  return (
    <div className="panel-select" ref={rootRef}>
      {name && <input type="hidden" name={name} value={current} disabled={disabled} />}
      <button
        type="button"
        className="panel-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className={selected ? undefined : "panel-select-placeholder"}>{shown}</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={ariaLabel} className="panel-select-list">
          {options.map((option) => {
            const isSelected = option.value === current;
            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  disabled={option.disabled}
                  className={`panel-select-option${isSelected ? " selected" : ""}`}
                  onClick={() => choose(option.value)}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
