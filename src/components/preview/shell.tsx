"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, DesignIcon } from "@/components/ui";
import { usePreview } from "./context";
import { NotificationSummary } from "./notifications";

const adminNavigation = [
  ["Inicio", "", "dashboard"],
  ["Propietarios", "propietarios", "users"],
  ["Negocios", "negocios", "hotel"],
  ["Servicios", "servicios", "hotel"],
  ["Sitios turísticos", "sitios", "pin"],
  ["Promociones", "promociones", "tag"],
  ["Notificaciones", "notificaciones", "bell"],
  ["Revisión", "revision", "eye"],
  ["Historial", "historial", "clock"],
];
const ownerNavigation = [
  ["Inicio", "", "dashboard"],
  ["Mi negocio", "mi-negocio", "hotel"],
  ["Mis servicios", "servicios", "hotel"],
  ["Mis promociones", "promociones", "tag"],
  ["Notificaciones", "notificaciones", "bell"],
];

// Reproduce el marco de Figma y convierte la navegación en un cajón en pantallas pequeñas.
export function PreviewShell({
  title,
  section,
  children,
  actions,
}: {
  title: string;
  section: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { role, message, dismiss, notify } = usePreview();
  const [menuOpen, setMenuOpen] = useState(false);
  const base = `/vista-previa/${role}`;
  const navigation = role === "admin" ? adminNavigation : ownerNavigation;

  return (
    <div className="app-shell">
      <a href="#contenido" className="skip-link">
        Ir al contenido
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Cerrar menú"
        />
      )}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`} aria-label="Menú principal">
        <Image
          src="/Logo-rectangular.svg"
          width={1062}
          height={339}
          alt="Panamá Viajero"
          className="sidebar-logo"
          priority
        />
        <Badge>{role === "admin" ? "Administración" : "Mi negocio"}</Badge>
        <nav className="navigation">
          {navigation.map(([label, path, icon]) =>
            role === "admin" && path === "" ? (
              <button
                key={path}
                type="button"
                className="unavailable-navigation"
                onClick={() => {
                  notify("Sección no habilitada");
                  setMenuOpen(false);
                }}
              >
                <DesignIcon name={icon} />
                <span>{label}</span>
              </button>
            ) : (
              <Link
                key={path}
                href={`${base}/${path}`}
                onClick={() => setMenuOpen(false)}
                className={section === path ? "active" : ""}
                aria-current={section === path ? "page" : undefined}
              >
                <DesignIcon name={icon} />
                <span>{label}</span>
              </Link>
            ),
          )}
        </nav>
        <Link href={`${base}/cuenta`} className="account-link">
          <span className="initials">{role === "admin" ? "AJ" : "ML"}</span>
          <span>
            {role === "admin" ? "Equipo Panamá Viajero" : "María López"}
            <small>{role === "admin" ? "Administrador" : "Propietaria"}</small>
          </span>
        </Link>
        <Link href="/" className="logout-link">
          Salir de la vista previa
        </Link>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Button
            tone="quiet"
            className="menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Abrir menú"
            aria-expanded={menuOpen}
          >
            ☰
          </Button>
          <span className="breadcrumb">Espacio de trabajo / {title}</span>
          <Badge>Vista previa · datos ilustrativos</Badge>
          <NotificationSummary />
        </header>
        <main id="contenido" className="workspace-content">
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>
                {role === "admin"
                  ? "Gestiona la experiencia de Panamá Viajero."
                  : "Todo lo que necesitas para dar a conocer tu negocio."}
              </p>
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
      {message && (
        <div className="toast" role="status">
          <span>{message}</span>
          <button onClick={dismiss} aria-label="Cerrar mensaje">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
