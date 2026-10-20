import {
  Building2,
  ClipboardCheck,
  Bell,
  Home,
  KeyRound,
  LayoutDashboard,
  Layers,
  MapPin,
  Tag,
  UserRound,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import type { PanelRole } from "@/types/panel";

export type PanelNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Secciones visibles por rol. Las rutas se protegen también en cada página.
const NAVIGATION: Record<PanelRole, PanelNavItem[]> = {
  owner: [
    { href: "/panel", label: "Resumen", icon: LayoutDashboard },
    { href: "/panel/revision", label: "Revisión", icon: ClipboardCheck },
    { href: "/panel/negocios", label: "Negocios", icon: Building2 },
    { href: "/panel/propietarios", label: "Propietarios", icon: UserRound },
    { href: "/panel/sitios", label: "Destinos", icon: MapPin },
    { href: "/panel/promociones", label: "Promociones", icon: Tag },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell },
    { href: "/panel/permisos", label: "Permisos", icon: KeyRound },
  ],
  admin: [
    { href: "/panel", label: "Resumen", icon: LayoutDashboard },
    { href: "/panel/revision", label: "Revisión", icon: ClipboardCheck },
    { href: "/panel/negocios", label: "Negocios", icon: Building2 },
    { href: "/panel/propietarios", label: "Propietarios", icon: UserRound },
    { href: "/panel/sitios", label: "Destinos", icon: MapPin },
    { href: "/panel/promociones", label: "Promociones", icon: Tag },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell },
    { href: "/panel/permisos", label: "Permisos", icon: KeyRound },
  ],
  collaborator: [
    { href: "/panel", label: "Inicio", icon: Home },
    { href: "/panel/negocios", label: "Negocios", icon: Building2 },
    { href: "/panel/propietarios", label: "Propietarios", icon: UserRound },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell },
    { href: "/panel/permisos", label: "Permisos", icon: KeyRound },
  ],
  propietario: [
    { href: "/panel", label: "Mi panel", icon: LayoutDashboard },
    { href: "/panel/negocios", label: "Mi negocio", icon: Briefcase },
    { href: "/panel/servicios", label: "Mis servicios", icon: Layers },
    { href: "/panel/promociones", label: "Mis promociones", icon: Tag },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell },
  ],
};

// Devuelve el menú correspondiente al rol validado en Supabase.
export function getPanelNavigation(role: PanelRole): PanelNavItem[] {
  return NAVIGATION[role];
}
