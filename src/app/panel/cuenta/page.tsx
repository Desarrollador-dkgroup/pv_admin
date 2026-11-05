import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui";
import { OwnNameForm } from "@/components/panel-own-name-form";
import { CoOwnerForm, RemoveCoOwnerButton } from "@/components/panel-co-owner-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getPublicNames } from "@/lib/panel-people";

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
  // Los nombres se leen con la sesión del propietario, sin la clave de servicio.
  const names = await getPublicNames(supabase, members.map((member) => member.user_id));

  return (
    <>
      <PageHeader
        title="Mi cuenta"
        description="Tus datos y las personas que administran tu negocio. Todas tienen los mismos permisos."
      />
      <div className="split wide-side">
      <div className="stack">
      <Panel>
        <h2>Personas con acceso</h2>
        {members.map((member) => (
          <div className="list-row" key={member.user_id}>
            <div className="list-row-text">
              <b>{names.get(member.user_id) ?? "Cuenta sin nombre"}</b>
              <small>
                {member.added_by === null ? "Propietario principal" : "Perfil adicional"}
                {member.user_id === user.id ? " · tú" : ""}
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
      </div>
      <div className="stack">
        <Panel>
          <h2>Mis datos</h2>
          <OwnNameForm name={String(user.user_metadata?.display_name ?? "")} />
          <label className="field">
            Correo
            <input value={user.email ?? ""} readOnly aria-readonly="true" />
            <small className="muted">Para cambiarlo escribe al equipo.</small>
          </label>
        </Panel>
        <Panel>
          <h2>Contraseña</h2>
          <p className="muted">Cámbiala cuando quieras.</p>
          <Link className="button secondary" href="/acceso?modo=cambiar">Cambiar contraseña</Link>
        </Panel>
      </div>
      </div>
    </>
  );
}
