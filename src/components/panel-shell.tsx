import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { PanelRole } from "@/types/panel";
import { SignOut } from "@/components/sign-out";

const adminLinks = [
  ["Resumen", "/panel"],
  ["Servicios", "/panel/servicios"],
  ["Revisión", "/panel/revision"],
  ["Permisos", "/panel/permisos"],
];

const ownerLinks = [
  ["Mi panel", "/panel"],
  ["Mis servicios", "/panel/servicios"],
];

const collaboratorLinks = [["Permisos", "/panel/permisos"]];

// Presenta la navegación real para administradores y propietarios autenticados.
export function PanelShell({
  role,
  children,
}: {
  role: PanelRole;
  children: ReactNode;
}) {
  const isStaff = role !== "propietario";
  const links = role === "collaborator"
    ? collaboratorLinks
    : isStaff ? adminLinks : ownerLinks;

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Menú principal">
        <Link href="/panel" aria-label="Panamá Viajero, panel">
          <Image
            src="/Logo-rectangular.svg"
            width={1062}
            height={339}
            alt="Panamá Viajero"
            className="sidebar-logo"
          />
        </Link>
        <span className="badge">
          {role === "owner" ? "Propietario principal" :
            role === "admin" ? "Administrador" :
              role === "collaborator" ? "Colaborador" : "Panel del propietario"}
        </span>
        <nav className="navigation">
          {links.map(([label, href]) => (
            <Link href={href} key={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="account-link">
          <span>{role === "owner" ? "Propietario principal" :
            role === "admin" ? "Administrador" :
              role === "collaborator" ? "Colaborador" : "Propietario de negocio"}</span>
        </div>
        <SignOut />
      </aside>
      <main id="contenido" className="workspace-content">
        {children}
      </main>
    </div>
  );
}
