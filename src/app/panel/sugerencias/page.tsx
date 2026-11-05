import Link from "next/link";
import { Badge, Button, PageHeader } from "@/components/ui";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { setSuggestionStatusAction } from "./actions";

const STATUS_LABELS: Record<string, string> = { new: "Nueva", read: "Leída", archived: "Archivada" };

// Sugerencias de visitantes. Las anónimas no muestran nombre.
export default async function SuggestionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado = "new" } = await searchParams;
  const { role } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const { data, error } = await getSupabaseAdminClient()
    .from("suggestions")
    .select("id, message, is_anonymous, author_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("No se pudieron cargar las sugerencias.");
  const all = data ?? [];
  const rows = estado === "todas" ? all : all.filter((item) => item.status === estado);
  const filters = [
    { key: "new", label: "Nuevas" },
    { key: "read", label: "Leídas" },
    { key: "archived", label: "Archivadas" },
    { key: "todas", label: "Todas" },
  ];

  return (
    <>
      <PageHeader
        title="Sugerencias"
        description="Lo que escriben los visitantes. Las anónimas no muestran quién las envió."
      />
      <nav className="chip-row" aria-label="Filtrar sugerencias">
        {filters.map((item) => (
          <Link key={item.key} href={`/panel/sugerencias?estado=${item.key}`}
            className={`chip ${estado === item.key ? "active" : ""}`}>
            {item.label}{" "}
            <span>{item.key === "todas" ? all.length : all.filter((row) => row.status === item.key).length}</span>
          </Link>
        ))}
      </nav>
      {rows.map((item) => (
        <article key={item.id} className={`panel notice-card ${item.status === "new" ? "unread" : ""}`}>
          <span className="notice-icon" aria-hidden="true">💡</span>
          <div className="list-row-text">
            <div className="actions">
              <Badge tone={item.status === "new" ? "info" : "neutral"}>
                {STATUS_LABELS[item.status] ?? item.status}
              </Badge>
              <small>
                {new Date(item.created_at).toLocaleString("es-PA")} ·{" "}
                {item.is_anonymous ? "Anónima" : `De: ${item.author_name ?? "Cliente"}`}
              </small>
            </div>
            <p>{item.message}</p>
          </div>
          <div className="actions">
            {item.status !== "read" && (
              <form action={setSuggestionStatusAction}>
                <input type="hidden" name="suggestion_id" value={item.id} />
                <input type="hidden" name="status" value="read" />
                <Button type="submit" tone="secondary" className="small">Marcar como leída</Button>
              </form>
            )}
            {item.status !== "archived" && (
              <form action={setSuggestionStatusAction}>
                <input type="hidden" name="suggestion_id" value={item.id} />
                <input type="hidden" name="status" value="archived" />
                <Button type="submit" tone="quiet" className="small">Archivar</Button>
              </form>
            )}
            {item.status === "archived" && (
              <form action={setSuggestionStatusAction}>
                <input type="hidden" name="suggestion_id" value={item.id} />
                <input type="hidden" name="status" value="read" />
                <Button type="submit" tone="quiet" className="small">Desarchivar</Button>
              </form>
            )}
          </div>
        </article>
      ))}
      {!rows.length && (
        <p className="muted">{all.length ? "No hay sugerencias en este filtro." : "Aún no hay sugerencias."}</p>
      )}
    </>
  );
}
