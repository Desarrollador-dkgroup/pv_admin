"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type AuthMode = "login" | "forgot" | "change" | "temporary" | "sent";
type Props = { initialMode?: AuthMode };

// Gestiona el inicio de sesión real y la recuperación de contraseña en Supabase.
export function AuthScreen({ initialMode = "login" }: Props) {
  const router = useRouter();
  // Controla el formulario, la validación y el progreso del acceso.
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titles = {
    login: "Bienvenido al Panel del propietario",
    forgot: "Recupera tu acceso",
    change: "Cambiar contraseña",
    temporary: "Cambia tu contraseña temporal",
    sent: "Instrucciones enviadas",
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") ?? "");
    const password = String(values.get("password") ?? "");
    if (["change", "temporary"].includes(mode) && password !== values.get("confirm")) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "forgot") {
        const result = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/acceso?modo=cambiar`,
        });
        if (result.error)
          throw new Error("No se pudieron enviar las instrucciones. Intenta nuevamente.");
        setMode("sent");
      } else if (mode === "change" || mode === "temporary") {
        // Guarda la contraseña definitiva y quita la marca de contraseña temporal.
        const result = await supabase.auth.updateUser({
          password,
          data: { must_change_password: false },
        });
        if (result.error) {
          throw new Error(
            mode === "change"
              ? "El enlace de recuperación no es válido o expiró."
              : "No se pudo guardar la contraseña. Intenta nuevamente.",
          );
        }
        router.push("/panel");
        router.refresh();
      } else {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error)
          throw new Error("No pudimos iniciar sesión. Revisa tu correo y contraseña.");
        // Una contraseña temporal obliga a definir una nueva antes de entrar al panel.
        if (result.data.user?.user_metadata?.must_change_password === true) {
          setMode("temporary");
          return;
        }
        router.push("/panel");
        router.refresh();
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo completar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <span className="brand">Panel del propietario</span>
        <h1>
          Un solo lugar.
          <br />
          Todas tus experiencias.
        </h1>
        <p>Gestiona servicios, conecta destinos y da a conocer lo mejor de Panamá.</p>
        <Image
          src="/Logo-rectangular-blanco.svg"
          width={1062}
          height={339}
          alt="Panamá Viajero"
          className="auth-logo"
          priority
        />
      </section>
      <section className="auth-form">
        <div className="auth-form-inner">
          <h2>{titles[mode]}</h2>
          <p>
            {mode === "temporary"
              ? "Antes de continuar, reemplaza tu contraseña temporal."
              : mode === "sent"
                ? "Si el correo pertenece a una cuenta, recibirás las instrucciones."
                : "Ingresa con el acceso que te proporcionó Panamá Viajero."}
          </p>
          {mode !== "sent" && (
            <form key={mode} onSubmit={submit}>
              {["login", "forgot"].includes(mode) && (
                <label className="field">
                  Correo electrónico
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="username"
                  />
                </label>
              )}
              {mode !== "forgot" && (
                <label className="field">
                  {["change", "temporary"].includes(mode) ? "Nueva contraseña" : "Contraseña"}
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={mode === "login" ? 1 : 12}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                  />
                </label>
              )}
              {["change", "temporary"].includes(mode) && (
                <label className="field">
                  Confirmar contraseña
                  <input
                    name="confirm"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                  />
                </label>
              )}
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy}>
                {busy
                  ? "Procesando..."
                  : mode === "login"
                    ? "Iniciar sesión"
                    : mode === "forgot"
                      ? "Enviar instrucciones"
                      : "Guardar contraseña"}
              </Button>
            </form>
          )}
          {mode === "login" ? (
            <Button
              tone="quiet"
              onClick={() => {
                setMode("forgot");
                setError("");
              }}
            >
              Olvidé mi contraseña
            </Button>
          ) : (
            mode !== "temporary" && (
              <Button
                tone="quiet"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Volver al acceso
              </Button>
            )
          )}
        </div>
      </section>
    </main>
  );
}
