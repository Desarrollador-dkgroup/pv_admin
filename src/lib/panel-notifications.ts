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

  // Promociones de servicio activas que terminan dentro de siete días.
  if (isStaff || role === "propietario") {
    const today = nowIso.slice(0, 10);
    const soon = soonIso.slice(0, 10);
    let query = supabase
      .from("service_promotions")
      .select("id, title, ends_on, services!inner(business_id)")
      .eq("is_active", true)
      .eq("schedule_mode", "range")
      .gte("ends_on", today)
      .lte("ends_on", soon)
      .order("ends_on")
      .limit(limit);
    if (role === "propietario") query = query.in("services.business_id", businessIds);
    const { data: expiring } = role === "propietario" && !businessIds.length
      ? { data: [] }
      : await query;
    for (const promotion of expiring ?? []) {
      notifications.push({
        id: `promotion-${promotion.id}`,
        title: "Promoción por vencer",
        detail: `${promotion.title} · termina el ${promotion.ends_on}`,
        href: `/panel/promociones/${promotion.id}`,
        tone: "info",
      });
    }
  }

  // Contratos: el equipo verifica copias firmadas; el negocio firma los emitidos.
  if (isStaff) {
    const { data: submitted } = await supabase
      .from("business_contracts")
      .select("business_id, businesses(name)")
      .eq("status", "submitted")
      .limit(limit);
    for (const contract of submitted ?? []) {
      const business = contract.businesses as { name?: string } | { name?: string }[] | null;
      const name = Array.isArray(business) ? business[0]?.name : business?.name;
      notifications.push({
        id: `contract-submitted-${contract.business_id}`,
        title: "Copia firmada por verificar",
        detail: name ?? "Contrato de un negocio",
        href: `/panel/contratos/${contract.business_id}`,
        tone: "alert",
      });
    }
    const { count: newSuggestions } = await supabase
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    if (newSuggestions) {
      notifications.push({
        id: "suggestions-new",
        title: newSuggestions === 1 ? "1 sugerencia nueva" : `${newSuggestions} sugerencias nuevas`,
        detail: "Escritas por visitantes de la web.",
        href: "/panel/sugerencias",
        tone: "info",
      });
    }
  }
  // Solicitudes de anuncio nuevas, para el equipo.
  if (isStaff) {
    const { count: newAdRequests } = await supabase
      .from("ad_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "solicitado");
    if (newAdRequests) {
      notifications.push({
        id: "ad-requests-new",
        title: newAdRequests === 1 ? "1 solicitud de anuncio nueva" : `${newAdRequests} solicitudes de anuncio nuevas`,
        detail: "Los propietarios pidieron anuncios para sus promociones.",
        href: "/panel/anuncios",
        tone: "alert",
      });
    }
  }

  // Resultado de las solicitudes de anuncio, para el propietario.
  if (role === "propietario" && businessIds.length) {
    const { data: adResults } = await supabase
      .from("ad_requests")
      .select("id, title, status, rejection_reason")
      .in("business_id", businessIds)
      .in("status", ["publicado", "rechazado"])
      .order("updated_at", { ascending: false })
      .limit(limit);
    for (const request of adResults ?? []) {
      notifications.push({
        id: `ad-${request.id}-${request.status}`,
        title: request.status === "publicado"
          ? "Tu anuncio se publicó"
          : "Tu solicitud de anuncio fue rechazada",
        detail: request.status === "publicado"
          ? request.title
          : request.rejection_reason || request.title,
        href: "/panel/anuncios",
        tone: "info",
      });
    }
  }

  if (role === "propietario" && businessIds.length) {
    const { data: issued } = await supabase
      .from("business_contracts")
      .select("business_id, rejection_reason")
      .in("business_id", businessIds)
      .eq("status", "issued");
    for (const contract of issued ?? []) {
      notifications.push({
        id: `contract-issued-${contract.business_id}`,
        title: contract.rejection_reason
          ? "Tu copia firmada fue rechazada"
          : "Tienes un contrato por firmar",
        detail: contract.rejection_reason || "Fírmalo y súbelo en «Mi contrato».",
        href: "/panel/mi-contrato",
        tone: "alert",
      });
    }
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
