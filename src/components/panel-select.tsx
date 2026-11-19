"use client";

import { useEffect, useRef, useState } from "react";

type Option = { value: string; label: string };

// Selector con diseño propio: el valor viaja en un campo oculto, así que sigue funcionando
// en formularios GET y en acciones del servidor, igual que un <select> normal.
export function PanelSelect({
  name,
  options,
  defaultValue = "",
  ariaLabel,
  onChange,
}: {
  name: string;
  options: Option[];
  defaultValue?: string;
  ariaLabel: string;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.value === value) ?? options[0];

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

  return (
    <div className="panel-select" ref={rootRef}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        className="panel-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span>{current?.label}</span>
      </button>
      {open && (
        <ul role="listbox" aria-label={ariaLabel} className="panel-select-list">
          {options.map((option) => {
            const selected = option.value === value;
            return (
              <li key={option.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`panel-select-option${selected ? " selected" : ""}`}
                  onClick={() => {
                    setValue(option.value);
                    setOpen(false);
                    onChange?.(option.value);
                  }}
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
