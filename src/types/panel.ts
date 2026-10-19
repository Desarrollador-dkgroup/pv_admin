// Distingue el equipo interno de los propietarios de negocios.
// owner: propietario principal de la plataforma (admin-propietario).
export type PanelRole =
  | "owner"
  | "admin"
  | "collaborator"
  | "propietario";

// Etiquetas visibles de cada rol en la barra lateral, tarjetas y tablas.
export const ROLE_LABELS: Record<PanelRole, string> = {
  owner: "Propietario principal",
  admin: "Administrador",
  collaborator: "Colaborador",
  propietario: "Propietario de negocio",
};

// Identifica las cuentas internas de Panamá Viajero.
export function isPlatformRole(role: PanelRole) {
  return role !== "propietario";
}

// Los roles internos con gestión completa del catálogo son propietario principal y admin.
export function canManageCatalog(role: PanelRole) {
  return role === "owner" || role === "admin";
}
