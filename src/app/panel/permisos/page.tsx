import { Panel } from "@/components/ui";
import { getPanelIdentity } from "@/lib/panel-access";

// Informa el alcance actual del módulo de permisos.
export default async function PermissionsPage() {
  const { role } = await getPanelIdentity();

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>Permisos</h1>
          <p>Administración de accesos del equipo Panamá Viajero.</p>
        </div>
      </header>
      <Panel>
        <h2>{role === "collaborator" ? "Acceso de colaborador" : "Roles de plataforma"}</h2>
        <p>
          Los roles Propietario, Administrador y Colaborador ya se validan
          desde Supabase. La administración de cuentas desde esta pantalla
          se habilitará en una siguiente etapa.
        </p>
      </Panel>
    </>
  );
}
