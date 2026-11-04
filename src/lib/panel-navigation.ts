import {
  Building2,
  ClipboardCheck,
  Bell,
  FileText,
  Home,
  KeyRound,
  LayoutDashboard,
  Layers,
  Megaphone,
  MessageSquare,
  MapPin,
  Tag,
  UserRound,
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
    { href: "/panel/anuncios", label: "Anuncios", icon: Megaphone },
    { href: "/panel/contratos", label: "Contratos", icon: FileText },
    { href: "/panel/sugerencias", label: "Sugerencias", icon: MessageSquare },
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
    { href: "/panel/anuncios", label: "Anuncios", icon: Megaphone },
    { href: "/panel/contratos", label: "Contratos", icon: FileText },
    { href: "/panel/sugerencias", label: "Sugerencias", icon: MessageSquare },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell },
    { href: "/panel/permisos", label: "Permisos", icon: KeyRound },
  ],
  collaborator: [
    { href: "/panel/revision", label: "Revisión", icon: ClipboardCheck },
    { href: "/panel", label: "Inicio", icon: Home },
    { href: "/panel/negocios", label: "Negocios", icon: Building2 },
    { href: "/panel/propietarios", label: "Propietarios", icon: UserRound },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell },
  ],
  propietario: [
    { href: "/panel", label: "Mi panel", icon: LayoutDashboard },
    { href: "/panel/servicios", label: "Mis servicios", icon: Layers },
    { href: "/panel/cuenta", label: "Mi cuenta", icon: UserRound },
    { href: "/panel/promociones", label: "Mis promociones", icon: Tag },
    { href: "/panel/mi-contrato", label: "Mi contrato", icon: FileText },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell },
  ],
};

// Devuelve el menú correspondiente al rol validado en Supabase.
export function getPanelNavigation(role: PanelRole): PanelNavItem[] {
  return NAVIGATION[role];
}
