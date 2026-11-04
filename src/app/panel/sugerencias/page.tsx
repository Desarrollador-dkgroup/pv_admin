import { Badge, Button, Panel } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { setSuggestionStatusAction } from "./actions";

const STATUS_LABELS: Record<string, string> = { new: "Nueva", read: "Leída", archived: "Archivada" };

// Sugerencias de visitantes. Las anónimas no muestran nombre.
export default async function SuggestionsAdminPage() {
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const { data, error } = await getSupabaseAdminClient()
    .from("suggestions")
    .select("id, message, is_anonymous, author_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("No se pudieron cargar las sugerencias.");

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Sugerencias</h1>
          <p>Lo que escriben los visitantes. Las anónimas no muestran quién las envió.</p>
        </div>
      </header>
      {(data ?? []).map((item) => (
        <Panel key={item.id}>
          <div className="actions">
            <Badge>{STATUS_LABELS[item.status] ?? item.status}</Badge>
            <small className="table-subtitle">
              {new Date(item.created_at).toLocaleString("es-PA")}
            </small>
          </div>
          <p>{item.message}</p>
          <p className="muted">
            {item.is_anonymous ? "Anónima" : `De: ${item.author_name ?? "Cliente"}`}
          </p>
          <div className="actions">
            {item.status !== "read" && (
              <form action={setSuggestionStatusAction}>
                <input type="hidden" name="suggestion_id" value={item.id} />
                <input type="hidden" name="status" value="read" />
                <Button type="submit" tone="secondary">Marcar como leída</Button>
              </form>
            )}
            {item.status !== "archived" && (
              <form action={setSuggestionStatusAction}>
                <input type="hidden" name="suggestion_id" value={item.id} />
                <input type="hidden" name="status" value="archived" />
                <Button type="submit" tone="quiet">Archivar</Button>
              </form>
            )}
          </div>
        </Panel>
      ))}
      {!(data ?? []).length && <p className="muted">Aún no hay sugerencias.</p>}
    </>
  );
}
