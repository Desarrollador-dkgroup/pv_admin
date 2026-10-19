"use client";

import { useActionState, useState, useTransition } from "react";
import {
  createTeamAccountAction,
  deleteTeamAccountAction,
  generateTemporaryPasswordAction,
  resetTemporaryPasswordAction,
  updateTeamRoleAction,
} from "@/app/panel/permisos/actions";
import { Button } from "@/components/ui";

type TeamRole = "admin" | "collaborator";
type Message = { tone: "ok" | "error"; text: string } | null;

const ROLE_NAMES: Record<TeamRole, string> = {
  admin: "Administrador",
  collaborator: "Colaborador",
};

// Alta de una cuenta: datos, contraseña temporal generada y botón final para crearla.
export function CreateTeamAccountForm({ roles }: { roles: TeamRole[] }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<TeamRole>(roles[0] ?? "collaborator");
  // La contraseña solo es válida para los datos con los que se generó; se borra si cambian.
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [busy, startTransition] = useTransition();
  const filled = email.trim() !== "" && name.trim() !== "";

  // Pide al servidor una contraseña temporal para estos datos.
  function generate() {
    setMessage(null);
    startTransition(async () => {
      const result = await generateTemporaryPasswordAction({ email, name, role });
      if (result.error || !result.password) {
        setMessage({ tone: "error", text: result.error || "No se pudo generar la contraseña." });
        return;
      }
      setPassword(result.password);
    });
  }

  // Crea la cuenta con los datos y la contraseña generada, y limpia el formulario.
  function create() {
    setMessage(null);
    const shownEmail = email.trim().toLowerCase();
    startTransition(async () => {
      const result = await createTeamAccountAction({ email, name, role, password });
      if (result.error) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      setEmail("");
      setName("");
      setPassword("");
      setMessage({
        tone: "ok",
        text: `Cuenta creada para ${shownEmail}. Entrega el correo y la contraseña temporal.`,
      });
    });
  }

  // Copia la contraseña al portapapeles para entregarla sin errores de dictado.
  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      setMessage({ tone: "ok", text: "Contraseña copiada." });
    } catch {
      setMessage({ tone: "error", text: "No se pudo copiar. Selecciónala manualmente." });
    }
  }

  return (
    <form className="create-account-form" onSubmit={(event) => event.preventDefault()}>
      <div className="form-row">
        <label className="field">
          Correo
          <input
            type="email"
            value={email}
            autoComplete="off"
            onChange={(event) => { setEmail(event.target.value); setPassword(""); }}
            placeholder="persona@correo.com"
          />
        </label>
        <label className="field">
          Nombre de la persona
          <input
            value={name}
            maxLength={80}
            onChange={(event) => { setName(event.target.value); setPassword(""); }}
            placeholder="Nombre y apellido"
          />
        </label>
      </div>
      <label className="field">
        Rol de equipo
        <select
          value={role}
          onChange={(event) => { setRole(event.target.value as TeamRole); setPassword(""); }}
        >
          {roles.map((item) => (
            <option key={item} value={item}>{ROLE_NAMES[item]}</option>
          ))}
        </select>
      </label>

      {password ? (
        <div className="password-box">
          <span className="field">Contraseña temporal</span>
          <div className="password-row">
            <input readOnly value={password} aria-label="Contraseña temporal" />
            <Button tone="secondary" type="button" onClick={copyPassword}>Copiar</Button>
          </div>
          <small className="muted">
            Se muestra una sola vez en esta pantalla. Si cambias un dato, se debe generar otra.
          </small>
        </div>
      ) : (
        <Button
          tone="secondary"
          type="button"
          onClick={generate}
          disabled={!filled || busy}
        >
          {busy ? "Generando…" : "Generar contraseña temporal"}
        </Button>
      )}

      <Button type="button" onClick={create} disabled={!password || busy}>
        {busy && password ? "Agregando…" : "Agregar usuario"}
      </Button>

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"}
          className={message.tone === "error" ? "form-error" : "form-success"}>
          {message.text}
        </p>
      )}
    </form>
  );
}

// Cambia el rol de un miembro del equipo, limitado a los roles que el actor puede asignar.
export function TeamRoleForm({
  userId,
  currentRole,
  roles,
}: {
  userId: string;
  currentRole: TeamRole;
  roles: TeamRole[];
}) {
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();

  // Envía el nuevo rol al servidor, que vuelve a validar la matriz antes de guardar.
  function save(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      const result = await updateTeamRoleAction({ error: "" }, formData);
      setMessage(result.error);
    });
  }

  return (
    <form action={save} className="inline-form">
      <input type="hidden" name="user_id" value={userId} />
      <select name="platform_role" defaultValue={currentRole} aria-label="Cambiar rol">
        {roles.map((item) => (
          <option key={item} value={item}>{ROLE_NAMES[item]}</option>
        ))}
      </select>
      <Button tone="secondary" type="submit" disabled={busy}>
        {busy ? "Guardando…" : "Cambiar"}
      </Button>
      {message && <small role="alert" className="form-error">{message}</small>}
    </form>
  );
}

// Elimina la cuenta por completo, previa confirmación. El servidor vuelve a validar el permiso.
export function DeleteTeamAccountForm({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(deleteTeamAccountAction, { error: "" });
  const question = `¿Eliminar la cuenta de ${name}? Esta acción no se puede deshacer.`;

  return (
    <form
      action={action}
      className="team-delete"
      onSubmit={(event) => {
        if (!window.confirm(question)) event.preventDefault();
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <button type="submit" className="button danger-button" disabled={pending}>
        {pending ? "Eliminando…" : "Eliminar cuenta"}
      </button>
      {state.error && <small role="alert" className="form-error">{state.error}</small>}
    </form>
  );
}

// Genera una contraseña temporal nueva para la cuenta. Se muestra una sola vez para entregarla.
export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(resetTemporaryPasswordAction, { error: "" });

  return (
    <form action={action} className="account-form">
      <input type="hidden" name="user_id" value={userId} />
      {state.password && (
        <div className="password-box">
          <span className="field">Nueva contraseña temporal</span>
          <div className="password-row">
            <input readOnly value={state.password} aria-label="Nueva contraseña temporal" />
          </div>
          <small className="muted">
            Entrégala junto con el correo. Se muestra una sola vez en esta pantalla.
          </small>
        </div>
      )}
      <Button tone="secondary" type="submit" disabled={pending}>
        {pending ? "Generando…" : "Generar nueva contraseña temporal"}
      </Button>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
    </form>
  );
}
