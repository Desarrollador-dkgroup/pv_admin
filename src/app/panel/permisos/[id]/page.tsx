import Link from "next/link";
import { Badge, Panel } from "@/components/ui";
import {
  DeleteTeamAccountForm,
  ResetPasswordForm,
  TeamRoleForm,
} from "@/components/panel-team-forms";
import { PersonNameForm } from "@/components/panel-person-name-form";
import { getPanelIdentity, requireRole } from "@/lib/panel-access";
import { getAccountProfiles } from "@/lib/panel-people";
import { loadTeamTarget } from "@/lib/panel-team";
import { assignableTeamRoles, canEditName, canManageAccount } from "@/lib/panel-permissions";
import { ROLE_LABELS } from "@/types/panel";

// Edición de una cuenta: nombre, rol, contraseña temporal y eliminación, cada uno en su tarjeta.
export default async function EditTeamAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role, user } = await getPanelIdentity();
  requireRole(role, ["owner", "admin"]);

  const target = await loadTeamTarget(supabase, id);
  const profile = (await getAccountProfiles(supabase, [id])).get(id);
  const name = profile?.name ?? "Cuenta sin nombre";
  const email = profile?.email ?? "Sin correo registrado";
  const roles = assignableTeamRoles(role);
  const isSelf = id === user.id;
  const manageable = !isSelf && !target.error && canManageAccount(role, target.effectiveRole);
  const currentRole =
    target.teamRole === "admin" || target.teamRole === "collaborator"
      ? target.teamRole
      : roles[0];

  return (
    <>
      <header className="page-heading">
        <div>
          <Link className="back-link" href="/panel/permisos">← Volver al equipo</Link>
          <h1>{name}</h1>
          <p>{email}</p>
        </div>
        <Badge tone={target.teamRole ? "neutral" : "warning"}>
          {target.teamRole ? ROLE_LABELS[target.teamRole] : "Sin rol de equipo"}
        </Badge>
      </header>

      {!manageable ? (
        <Panel>
          <h2>No puedes editar esta cuenta</h2>
          <p className="muted">
            {target.error
              || (isSelf
                ? "Tu cuenta se administra desde tu sesión."
                : "Tu rol no permite administrar esta cuenta.")}
          </p>
        </Panel>
      ) : (
        <div className="account-editor">
          {canEditName(role, target.effectiveRole) && (
            <section className="account-card">
              <h2>Nombre</h2>
              <p className="muted">Así aparece en el panel y en las notificaciones.</p>
              <PersonNameForm userId={id} name={name} />
            </section>
          )}

          <section className="account-card">
            <h2>Rol de equipo</h2>
            <p className="muted">
              {target.teamRole
                ? "Cambia el rol que tiene esta cuenta dentro del panel."
                : "Esta cuenta no tiene rol. Asígnale uno para que pueda entrar al panel."}
            </p>
            <TeamRoleForm
              userId={id}
              currentRole={currentRole}
              roles={roles}
            />
          </section>

          <section className="account-card">
            <h2>Contraseña</h2>
            <p className="muted">
              Genera una contraseña temporal nueva. La persona deberá cambiarla al entrar.
            </p>
            <ResetPasswordForm userId={id} />
          </section>

          <section className="account-card account-danger">
            <h2>Eliminar cuenta</h2>
            <p className="muted">
              Borra el acceso, el perfil y el rol. Si la cuenta tiene reservas u otros
              datos, Supabase no permite borrarla.
            </p>
            <DeleteTeamAccountForm userId={id} name={name} />
          </section>
        </div>
      )}
    </>
  );
}
