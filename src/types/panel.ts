// Distingue el equipo interno de los propietarios de negocios.
export type PanelRole =
  | "owner"
  | "admin"
  | "collaborator"
  | "propietario";

// Identifica las cuentas internas de Panamá Viajero.
export function isPlatformRole(role: PanelRole) {
  return role !== "propietario";
}

// Los roles internos con gestión completa del catálogo son propietario y admin.
export function canManageCatalog(role: PanelRole) {
  return role === "owner" || role === "admin";
}
