// En la vista previa no hay sesión de visitante ni favoritos: estas funciones no hacen nada.
// Son las que usa la ficha pública para pedir inicio de sesión y guardar favoritos.
export function useAuthSession(): { status: "signedIn" | "signedOut" } {
  return { status: "signedOut" };
}

export function loginHref(path: string) {
  return `/acceso?volver=${encodeURIComponent(path)}`;
}

export function useIsFavorite(serviceId?: string): boolean {
  void serviceId;
  return false;
}

export function toggleFavorite(serviceId?: string): void {
  void serviceId;
}
