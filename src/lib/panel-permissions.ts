import type { PanelRole } from "@/types/panel";

// Matriz de gestión de cuentas del panel. Refleja las políticas RLS de las migraciones
// 202610150004 y 202610160001: la interfaz oculta lo que la base de datos ya bloquea.
//
// - owner (propietario principal): gestiona todas las cuentas excepto la suya protegida.
// - admin: gestiona colaboradores y propietarios de negocio, nunca a otros admins.
// - collaborator: gestiona únicamente propietarios de negocio.
// - propietario: no administra cuentas; solo ve su negocio.

// Indica si la cuenta "actor" puede crear, cambiar o quitar a una cuenta del rol "target".
export function canManageAccount(actor: PanelRole, target: PanelRole): boolean {
  if (actor === "owner") return target !== "owner";
  if (actor === "admin") return target === "collaborator" || target === "propietario";
  if (actor === "collaborator") return target === "propietario";
  return false;
}

// Roles de equipo interno que el actor puede asignar a una cuenta existente.
export function assignableTeamRoles(actor: PanelRole): Array<"admin" | "collaborator"> {
  if (actor === "owner") return ["admin", "collaborator"];
  if (actor === "admin") return ["collaborator"];
  return [];
}

// Indica si el actor puede gestionar negocios, miembros y propietarios de negocio.
export function canManageProviders(actor: PanelRole): boolean {
  return actor === "owner" || actor === "admin" || actor === "collaborator";
}

// Nombre visible: el propietario principal edita a todos. El admin edita colaboradores y
// propietarios de negocio, pero nunca el nombre de otro admin ni el del propietario principal.
export function canEditName(actor: PanelRole, target: PanelRole): boolean {
  if (actor === "owner") return true;
  if (actor === "admin") return target !== "owner" && target !== "admin";
  return false;
}
