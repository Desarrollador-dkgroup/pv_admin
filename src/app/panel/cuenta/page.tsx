import { Panel } from "@/components/ui";
import { CoOwnerForm, RemoveCoOwnerButton } from "@/components/panel-co-owner-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getAccountNames } from "@/lib/panel-people";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Mi cuenta: personas que administran el negocio y alta de otro perfil con los mismos permisos.
export default async function AccountPage() {
  const { supabase, role, businessIds, user } = await getPanelIdentity();
  requireRole(role, ["propietario"]);

  const businessId = businessIds[0];
  if (!businessId) {
    return (
      <Panel>
        <h1>Mi cuenta</h1>
        <p role="alert">Tu cuenta no tiene un negocio asignado.</p>
      </Panel>
    );
  }

  const { data, error } = await supabase
    .from("business_members")
    .select("user_id, added_by")
    .eq("business_id", businessId);
  if (error) throw new Error("No se pudieron cargar las personas con acceso.");

  const members = data ?? [];
  // Solo el propietario principal puede quitar perfiles adicionales.
  const viewerIsPrincipal = members.some(
    (member) => member.user_id === user.id && member.added_by === null,
  );
  const names = await getAccountNames(
    getSupabaseAdminClient(),
    members.map((member) => member.user_id),
  );

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Mi cuenta</h1>
          <p>Personas que administran tu negocio. Todas tienen los mismos permisos.</p>
        </div>
      </header>
      <Panel>
        <h2>Personas con acceso</h2>
        {members.map((member) => (
          <div className="member-row" key={member.user_id}>
            <div>
              <b>{names.get(member.user_id) ?? "Cuenta sin nombre"}</b>
              <small>
                {member.added_by === null ? "Propietario principal" : "Perfil adicional"}
              </small>
            </div>
            {viewerIsPrincipal && member.added_by !== null && (
              <RemoveCoOwnerButton
                userId={member.user_id}
                name={names.get(member.user_id) ?? "este perfil"}
              />
            )}
          </div>
        ))}
      </Panel>
      {viewerIsPrincipal && (
      <Panel>
        <h2>Agregar otra persona</h2>
        <p className="muted">
          Crea un perfil nuevo que entra a este mismo negocio, con su propia contraseña.
        </p>
        <CoOwnerForm />
      </Panel>
      )}
    </>
  );
}
