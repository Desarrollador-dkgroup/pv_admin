import { NextResponse } from "next/server";
import { getPanelIdentity } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { canManageCatalog } from "@/types/panel";

// Abre el documento firmado de un anuncio. La URL firmada se crea en el momento del clic,
// así no caduca mientras la página sigue abierta.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role } = await getPanelIdentity();
  if (!canManageCatalog(role)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const admin = getSupabaseAdminClient();
  const { data: request } = await admin
    .from("ad_requests")
    .select("document_path")
    .eq("ad_id", id)
    .maybeSingle();
  if (!request?.document_path) {
    return NextResponse.json({ error: "Este anuncio no tiene documento." }, { status: 404 });
  }

  const { data, error } = await admin.storage
    .from("contracts")
    .createSignedUrl(request.document_path, 300);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "No se pudo abrir el documento." }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl);
}
