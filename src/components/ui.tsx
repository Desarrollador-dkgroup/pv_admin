"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import { createRoot } from "react-dom/client";

// Reutiliza los SVG exportados de Figma con sus dimensiones originales.
export function DesignIcon({ name }: { name: string }) {
  return <Image src={`/figma/${name}.svg`} width={24} height={24} alt="" />;
}

export function Button({
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: "primary" | "secondary" | "quiet" | "danger";
}) {
  return <button type="button" className={`button ${tone} ${className}`} {...props} />;
}

// Etiqueta de estado; el tono colorea el fondo sin cambiar el texto.
export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return <span className={tone ? `badge tone-${tone}` : "badge"}>{children}</span>;
}

export function Panel({
  children,
  className = "",
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return <section id={id} className={`panel ${className}`}>{children}</section>;
}

// Utiliza un diálogo nativo para gestionar foco, Escape y navegación con teclado.
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog ref={dialog} className="modal" onCancel={onClose} aria-labelledby="modal-title">
      <header className="modal-heading">
        <h2 id="modal-title">{title}</h2>
        <button type="button" onClick={onClose} className="close-button" aria-label="Cerrar">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}

type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  danger?: boolean;
};

// Diálogo de confirmación del sistema; reemplaza a window.confirm en todo el panel.
function ConfirmDialog({ title, body, confirmLabel, danger, onDone }: ConfirmOptions & {
  onDone: (ok: boolean) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="modal confirm-dialog" onCancel={() => onDone(false)}
      aria-labelledby="confirm-title">
      <span className={`confirm-icon ${danger ? "danger" : ""}`} aria-hidden="true">
        {danger ? "!" : "?"}
      </span>
      <h2 id="confirm-title">{title}</h2>
      {body && <p className="muted">{body}</p>}
      <footer className="confirm-actions">
        <button type="button" className="button quiet" onClick={() => onDone(false)}>
          Cancelar
        </button>
        <button type="button" className={`button ${danger ? "danger" : "primary"}`} autoFocus
          onClick={() => onDone(true)}>
          {confirmLabel ?? "Confirmar"}
        </button>
      </footer>
    </dialog>
  );
}

// Abre el diálogo y resuelve true si la persona confirma.
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (ok: boolean) => {
      resolve(ok);
      root.unmount();
      host.remove();
    };
    root.render(<ConfirmDialog {...options} onDone={done} />);
  });
}

// Botón de envío que pide confirmación antes de mandar el formulario.
export function ConfirmSubmit({
  confirm,
  tone = "secondary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  confirm: ConfirmOptions;
  tone?: "primary" | "secondary" | "quiet" | "danger";
}) {
  const approved = useRef(false);
  async function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (approved.current) {
      approved.current = false;
      return;
    }
    event.preventDefault();
    const button = event.currentTarget;
    if (await confirmAction(confirm)) {
      approved.current = true;
      button.form?.requestSubmit(button);
    }
  }
  return (
    <button type="submit" className={`button ${tone} ${className}`} onClick={onClick} {...props}>
      {children}
    </button>
  );
}

// Encabezado de página del rediseño: volver, título, descripción y acciones.
export function PageHeader({
  title,
  description,
  back,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {back && <Link className="back-link" href={back.href}>‹ {back.label}</Link>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

// Pestañas por enlace o por ancla dentro de una misma página.
export function Tabs({ items, active }: {
  items: Array<{ id: string; label: string; href: string }>;
  active: string;
}) {
  return (
    <nav className="tabs" aria-label="Secciones">
      {items.map((item) => (
        <Link key={item.id} href={item.href} className={item.id === active ? "active" : undefined}
          aria-current={item.id === active ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// Tarjeta de métrica con enlace.
export function Metric({ label, value, hint, href }: {
  label: string;
  value: ReactNode;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {hint && <small>{hint}</small>}
    </>
  );
  return href
    ? <Link href={href} className="metric-card">{body}</Link>
    : <div className="metric-card">{body}</div>;
}
