import type { IconType } from "react-icons";
import {
  IoBedOutline,
  IoBusOutline,
  IoEllipsisHorizontalOutline,
  IoLocationOutline,
  IoRestaurantOutline,
  IoWalkOutline,
} from "react-icons/io5";

// Mismos íconos y colores que la portada pública (panama-viajero, home-sections.tsx).
const CATEGORY_ICONS: Record<string, { icon: IconType; color: string }> = {
  hospedaje: { icon: IoBedOutline, color: "#E07A3F" },
  restaurantes: { icon: IoRestaurantOutline, color: "#2F8FE0" },
  actividades: { icon: IoWalkOutline, color: "#A82C4C" },
  transporte: { icon: IoBusOutline, color: "#D23B3B" },
  "tour-operador": { icon: IoLocationOutline, color: "#324A91" },
};

// Solo el ícono; el nombre queda en title y aria-label para quien lo necesite.
export function CategoryIcon({ id, label }: { id: string; label: string }) {
  const entry = CATEGORY_ICONS[id];
  const Icon = entry?.icon ?? IoEllipsisHorizontalOutline;
  const color = entry?.color ?? "#66708a";
  return (
    <span className="category-icon" title={label} aria-label={label} role="img">
      <Icon size={16} color={color} aria-hidden />
    </span>
  );
}
