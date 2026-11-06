import {
  Building2,
  ClipboardCheck,
  Bell,
  FileText,
  Home,
  Inbox,
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
  // Sección del menú lateral a la que pertenece (agrupa los enlaces).
  group: string;
};

const GENERAL = "General";
const CATALOG = "Catálogo";
const MANAGEMENT = "Gestión";

// Secciones visibles por rol. Las rutas se protegen también en cada página.
// Owner y admin ven exactamente el mismo menú (diseño: 3 vistas, no 4).
const STAFF: PanelNavItem[] = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard, group: GENERAL },
  { href: "/panel/revision", label: "Revisión", icon: ClipboardCheck, group: GENERAL },
  { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell, group: GENERAL },
  { href: "/panel/negocios", label: "Negocios", icon: Building2, group: CATALOG },
  { href: "/panel/servicios", label: "Servicios", icon: Layers, group: CATALOG },
  { href: "/panel/propietarios", label: "Propietarios", icon: UserRound, group: CATALOG },
  { href: "/panel/solicitudes", label: "Solicitudes", icon: Inbox, group: CATALOG },
  { href: "/panel/sitios", label: "Destinos", icon: MapPin, group: CATALOG },
  { href: "/panel/promociones", label: "Promociones", icon: Tag, group: CATALOG },
  { href: "/panel/anuncios", label: "Anuncios", icon: Megaphone, group: CATALOG },
  { href: "/panel/contratos", label: "Contratos", icon: FileText, group: MANAGEMENT },
  { href: "/panel/sugerencias", label: "Sugerencias", icon: MessageSquare, group: MANAGEMENT },
  { href: "/panel/permisos", label: "Permisos", icon: KeyRound, group: MANAGEMENT },
];

const NAVIGATION: Record<PanelRole, PanelNavItem[]> = {
  owner: STAFF,
  admin: STAFF,
  collaborator: [
    { href: "/panel/revision", label: "Revisión", icon: ClipboardCheck, group: GENERAL },
    { href: "/panel", label: "Inicio", icon: Home, group: GENERAL },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell, group: GENERAL },
    { href: "/panel/negocios", label: "Negocios", icon: Building2, group: CATALOG },
    { href: "/panel/propietarios", label: "Propietarios", icon: UserRound, group: CATALOG },
  ],
  propietario: [
    { href: "/panel", label: "Mi panel", icon: LayoutDashboard, group: "Mi negocio" },
    { href: "/panel/servicios", label: "Mis servicios", icon: Layers, group: "Mi negocio" },
    { href: "/panel/promociones", label: "Mis promociones", icon: Tag, group: "Mi negocio" },
    { href: "/panel/anuncios", label: "Mis anuncios", icon: Megaphone, group: "Mi negocio" },
    { href: "/panel/mi-contrato", label: "Mi contrato", icon: FileText, group: "Mi negocio" },
    { href: "/panel/notificaciones", label: "Notificaciones", icon: Bell, group: "Cuenta" },
    { href: "/panel/cuenta", label: "Mi cuenta", icon: UserRound, group: "Cuenta" },
  ],
};

// Devuelve el menú correspondiente al rol validado en Supabase.
export function getPanelNavigation(role: PanelRole): PanelNavItem[] {
  return NAVIGATION[role];
}
