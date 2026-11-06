// Envía al equipo un correo con una solicitud nueva de «Quiero publicar mi negocio».
// La base llama esta función al insertar una fila en business_leads, pasando solo su id.
// La función lee la fila con la clave de servicio y no confía en los datos del cuerpo.
// Secretos: RESEND_API_KEY (obligatorio) y LEADS_FROM (opcional, remitente verificado).

import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const LEADS_TO = "desarrollo.dkgroup@gmail.com";
const DEFAULT_FROM = "Panamá Viajero <onboarding@resend.dev>";

// Escapa el texto que escribe el visitante antes de meterlo en el correo.
function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Método no permitido", { status: 405 });

  const body = await req.json().catch(() => null);
  const id = body?.record?.id ?? body?.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response("Falta la solicitud", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data: lead, error } = await supabase
    .from("business_leads")
    .select("business_name, legal_name, ruc, contact_person, phone, email, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) return new Response("No se pudo leer la solicitud", { status: 500 });
  if (!lead) return new Response("Solicitud no encontrada", { status: 404 });

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return new Response("Falta RESEND_API_KEY", { status: 500 });

  const rows: [string, string][] = [
    ["Nombre comercial", lead.business_name],
    ["Razón social", lead.legal_name],
    ["RUC", lead.ruc],
    ["Persona de contacto", lead.contact_person],
    ["Teléfono", lead.phone],
    ["Correo", lead.email],
  ];
  const html = `<h2>Nueva solicitud para publicar un negocio</h2>
<table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif">
${rows.map(([label, value]) =>
    `<tr><td style="border:1px solid #ddd"><b>${escapeHtml(label)}</b></td>` +
    `<td style="border:1px solid #ddd">${escapeHtml(value)}</td></tr>`).join("\n")}
</table>
<p style="font-family:Arial,sans-serif;color:#555">Recibida: ${escapeHtml(lead.created_at)}</p>`;

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("LEADS_FROM") ?? DEFAULT_FROM,
      to: [LEADS_TO],
      reply_to: lead.email,
      subject: `Nueva solicitud: ${lead.business_name}`,
      html,
    }),
  });
  if (!sent.ok) {
    return new Response(`Resend respondió ${sent.status}`, { status: 502 });
  }
  return new Response("ok", { status: 200 });
});
