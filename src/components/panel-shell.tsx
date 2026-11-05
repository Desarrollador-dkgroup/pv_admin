"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { PanelNotifications } from "@/components/panel-notifications";
import { SignOut } from "@/components/sign-out";
import type { PanelNotification } from "@/lib/panel-notifications";
import { getPanelNavigation } from "@/lib/panel-navigation";
import { ROLE_LABELS, type PanelRole } from "@/types/panel";

type Props = {
  role: PanelRole;
  notifications: PanelNotification[];
  profileName?: string;
  children: ReactNode;
};

// Estructura del panel: barra lateral por rol, avisos y área de contenido.
export function PanelShell({ role, notifications, profileName, children }: Props) {
  // Controla si el menú lateral está abierto en pantallas pequeñas.
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const links = getPanelNavigation(role);

  // Marca como activa la sección actual; la raíz solo coincide consigo misma.
  function isActive(href: string) {
    return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
  }

  // Sección actual para las migas; la página más específica gana.
  const current = links
    .filter((link) => isActive(link.href))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`} aria-label="Menú principal">
        <Link href="/panel" aria-label="Panamá Viajero, panel" onClick={() => setMenuOpen(false)}>
          <Image
            src="/Logo-rectangular-blanco.svg"
            width={1062}
            height={339}
            alt="Panamá Viajero"
            className="sidebar-logo"
          />
        </Link>
        <span className="role-chip">{ROLE_LABELS[role]}</span>
        {profileName && <p className="sidebar-profile">{profileName}</p>}
        <nav className="navigation">
          {links.map(({ href, label, icon: Icon, group }, index) => (
            <Fragment key={href}>
              {group !== links[index - 1]?.group && <p className="nav-group">{group}</p>}
              <Link
                href={href}
                className={isActive(href) ? "active" : undefined}
                aria-current={isActive(href) ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </Link>
            </Fragment>
          ))}
        </nav>
        <div className="sidebar-footer">
          <SignOut />
        </div>
      </aside>
      {menuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
          <p className="breadcrumb">
            {current ? (
              <>
                {current.group} <span aria-hidden="true">›</span> <b>{current.label}</b>
              </>
            ) : (
              ROLE_LABELS[role]
            )}
          </p>
          <PanelNotifications items={notifications} />
        </header>
        <main id="contenido" className="workspace-content">
          {children}
        </main>
      </div>
    </div>
  );
}
