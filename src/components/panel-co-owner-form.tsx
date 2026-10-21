"use client";

import { useActionState, useState } from "react";
import { addCoOwnerAction, removeCoOwnerAction } from "@/app/panel/cuenta/actions";
import { Button } from "@/components/ui";
import { generateTemporaryPassword } from "@/lib/panel-password";

// Formulario para crear un perfil adicional que administra el mismo negocio.
export function CoOwnerForm() {
  const [state, action, pending] = useActionState(addCoOwnerAction, { error: "", done: false });
  const [password, setPassword] = useState(() => generateTemporaryPassword());

  return (
    <form action={action} className="owner-business-edit">
      <label className="field">
        Nombre
        <input name="name" required minLength={2} maxLength={80} />
      </label>
      <label className="field">
        Correo
        <input name="email" type="email" required />
      </label>
      <label className="field">
        Contraseña temporal
        <input
          name="password"
          required
          minLength={10}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <Button
        tone="secondary"
        type="button"
        onClick={() => setPassword(generateTemporaryPassword())}
      >
        Generar otra
      </Button>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      {state.done && (
        <p className="muted">
          Perfil creado. Comparte el correo y la contraseña temporal; deberá cambiarla al entrar.
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Agregar persona"}
      </Button>
    </form>
  );
}

// Botón para quitar un perfil adicional. La confirmación se pide en el clic: cancelarla
// en onSubmit no detiene el envío de la acción del servidor.
export function RemoveCoOwnerButton({ userId, name }: { userId: string; name: string }) {
  return (
    <form action={removeCoOwnerAction}>
      <input type="hidden" name="user_id" value={userId} />
      <Button
        tone="quiet"
        type="submit"
        onClick={(event) => {
          if (!window.confirm(`¿Quitar a ${name}? Su cuenta se borra y perderá el acceso.`)) {
            event.preventDefault();
          }
        }}
      >
        Quitar
      </Button>
    </form>
  );
}
