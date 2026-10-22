"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Reutiliza los SVG exportados de Figma con sus dimensiones originales.
export function DesignIcon({ name }: { name: string }) {
  return <Image src={`/figma/${name}.svg`} width={24} height={24} alt="" />;
}

export function Button({
  tone = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "quiet" }) {
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
