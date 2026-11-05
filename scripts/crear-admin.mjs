// Crea una cuenta de equipo con rol de administrador.
// Uso (desde la raíz del repo, con .env.local que tenga NEXT_PUBLIC_SUPABASE_URL y
// SUPABASE_SERVICE_ROLE_KEY):
//   node --env-file=.env.local scripts/crear-admin.mjs correo@ejemplo.com "Nombre visible"
// La contraseña se pide en la consola y no se muestra ni se guarda en ningún archivo.
import { createClient } from "@supabase/supabase-js";

const [email, displayName = "Administrador"] = process.argv.slice(2);
if (!email) {
  console.error("Falta el correo. Uso: node --env-file=.env.local scripts/crear-admin.mjs correo nombre");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.");
  process.exit(1);
}

// Lee la contraseña sin mostrarla en pantalla. Requiere una terminal interactiva.
function askHidden(question) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      console.error("Este script necesita una terminal interactiva para pedir la contraseña.");
      process.exit(1);
    }
    process.stdout.write(question);
    const stdin = process.stdin;
    let input = "";
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input);
          return;
        }
        if (char === "\u0003") process.exit(130);
        if (char === "\u007f" || char === "\b") input = input.slice(0, -1);
        else input += char;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await askHidden("Contraseña (mínimo 10 caracteres): ");
if (password.length < 10) {
  console.error("La contraseña debe tener al menos 10 caracteres.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: displayName, must_change_password: false },
});
if (createError) {
  console.error(`No se creó la cuenta: ${createError.message}`);
  process.exit(1);
}
const userId = created.user.id;

const { error: roleError } = await admin
  .from("platform_admins")
  .upsert({ user_id: userId, platform_role: "admin" }, { onConflict: "user_id" });
if (roleError) {
  console.error(`La cuenta se creó, pero no se asignó el rol: ${roleError.message}`);
  console.error(`Revisa el usuario ${userId} en Supabase y vuelve a correr el paso del rol.`);
  process.exit(1);
}

console.log(`Listo: ${email} es administrador (id ${userId}).`);
