import * as Io5 from "react-icons/io5";
import type { IconType } from "react-icons";

// Ícono de Ionicons por nombre ("wifi-outline"), como los que guarda la base para
// comodidades y servicios de restaurante. Solo para componentes de servidor: importar todo el
// juego de íconos en el navegador pesaría demasiado.
export function IonIcon({ name, size = 22, color = "var(--indigo)" }: {
  name: string | null | undefined;
  size?: number;
  color?: string;
}) {
  const key = `Io${(name ?? "").split("-").map((part) =>
    part.charAt(0).toUpperCase() + part.slice(1)).join("")}`;
  const icons = Io5 as unknown as Record<string, IconType | undefined>;
  const Icon = icons[key] ?? Io5.IoCheckmarkCircleOutline;
  return <Icon size={size} color={color} aria-hidden />;
}
