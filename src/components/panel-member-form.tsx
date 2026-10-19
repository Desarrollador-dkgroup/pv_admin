"use client";

import { useActionState } from "react";
import { addBusinessMemberAction } from "@/app/panel/negocios/actions";
import { Button } from "@/components/ui";

type Account = { id: string; name: string };

// Formulario para asignar una cuenta existente a un negocio con su rol.
export function MemberAddForm({
  businessId,
  accounts,
}: {
  businessId: string;
  accounts: Account[];
}) {
  // Guarda el mensaje de error que devuelve el servidor tras validar la asignación.
  const [state, action, pending] = useActionState(addBusinessMemberAction, { error: "" });

  return (
    <form action={action} className="member-form">
      <input type="hidden" name="business_id" value={businessId} />
      <div className="form-row">
        <label className="field">
          Cuenta
          <select name="user_id" required defaultValue="">
            <option value="" disabled>Selecciona una cuenta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Rol en el negocio
          <select name="member_role" defaultValue="owner">
            <option value="owner">Propietario</option>
            <option value="staff">Colaborador del negocio</option>
          </select>
        </label>
      </div>
      {state.error && <p role="alert" className="form-error">{state.error}</p>}
      <Button type="submit" tone="secondary" disabled={pending || !accounts.length}>
        {pending ? "Asignando…" : "Asignar al negocio"}
      </Button>
      {!accounts.length && (
        <small className="muted">
          No hay cuentas disponibles. Crea primero la cuenta en Supabase Authentication.
        </small>
      )}
    </form>
  );
}
