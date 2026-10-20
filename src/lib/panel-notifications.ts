import type { SupabaseClient } from "@supabase/supabase-js";
import type { PanelRole } from "@/types/panel";

// Aviso mostrado en la campana y en la sección Notificaciones.
export type PanelNotification = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "alert" | "info";
};

const SEVEN_DAYS_MS = 7 * 86_400_000;

// Reúne avisos reales de Supabase. Cada rol solo recibe los de su alcance.
// Si una consulta falla, el aviso se omite: la campana no debe romper el panel.
export async function getPanelNotifications(
  supabase: SupabaseClient,
  role: PanelRole,
  businessIds: string[],
  limit = 20,
): Promise<PanelNotification[]> {
  const notifications: PanelNotification[] = [];
  const nowIso = new Date().toISOString();
  const soonIso = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
  const isStaff = role === "owner" || role === "admin";
  const isTeam = isStaff || role === "collaborator";

  // Cada envío a revisión llega a todo el equipo: admin, owner y colaboradores.
  if (isTeam) {
    const { data: pending } = await supabase
      .from("services")
      .select("id, name")
      .eq("review_status", "pending")
      .order("updated_at", { ascending: false })
      .limit(limit);
    for (const service of pending ?? []) {
      notifications.push({
        id: `review-${service.id}`,
        title: "Servicio pendiente de revisión",
        detail: service.name,
        href: "/panel/revision",
        tone: "alert",
      });
    }
  }

  // Los propietarios reciben el resultado de la revisión de sus propios servicios.
  if (role === "propietario" && businessIds.length) {
    const { data: rejected } = await supabase
      .from("services")
      .select("id, name, review_comment")
      .in("business_id", businessIds)
      .eq("review_status", "rejected")
      .limit(limit);
    for (const service of rejected ?? []) {
      notifications.push({
        id: `rejected-${service.id}`,
        title: "Servicio con cambios solicitados",
        detail: service.review_comment || service.name,
        href: `/panel/servicios/${service.id}`,
        tone: "alert",
      });
    }
  }

  // Promociones publicadas que terminan dentro de siete días.
  const { data: expiring } = await supabase
    .from("promotions")
    .select("id, title, valid_to")
    .eq("is_published", true)
    .gte("valid_to", nowIso)
    .lte("valid_to", soonIso)
    .order("valid_to")
    .limit(limit);
  for (const promotion of expiring ?? []) {
    notifications.push({
      id: `promotion-${promotion.id}`,
      title: "Promoción por vencer",
      detail: promotion.title,
      href: isStaff
        ? `/panel/promociones/${promotion.id}`
        : "/panel/promociones",
      tone: "info",
    });
  }

  // El equipo ve cuántas cuentas de propietarios están suspendidas.
  if (role === "owner" || role === "admin" || role === "collaborator") {
    const { count } = await supabase
      .from("blocked_users")
      .select("user_id", { count: "exact", head: true });
    if (count) {
      notifications.push({
        id: "suspended-accounts",
        title: "Cuentas suspendidas",
        detail: `${count} ${count === 1 ? "cuenta suspendida" : "cuentas suspendidas"}`,
        href: "/panel/propietarios?estado=suspendidos",
        tone: "info",
      });
    }
  }

  return notifications.slice(0, limit);
}
