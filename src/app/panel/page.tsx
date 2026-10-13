import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { SignOut } from "@/components/sign-out";

// Verifica identidad y rol en el servidor; la vista previa nunca concede acceso a esta ruta.
export default async function LivePanel() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/acceso");
  const [admin, memberships] = await Promise.all([
    supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("business_members").select("business_id, role").eq("user_id", user.id),
  ]);
  const role =
    !admin.error && admin.data
      ? "admin"
      : !memberships.error && memberships.data?.length
        ? "propietario"
        : null;
  let services: Array<{ id: string; name: string; status: string }> = [];
  let readError = false;
  // Se limita la consulta a los negocios que pertenecen al usuario autenticado.
  if (role) {
    const query = supabase.from("services").select("id, name, status");
    const result =
      role === "admin"
        ? await query.limit(50)
        : await query
            .in(
              "business_id",
              memberships.data!.map((member) => member.business_id),
            )
            .limit(50);
    readError = Boolean(result.error);
    services = result.data ?? [];
  }
  return (
    <main className="welcome">
      <Link href="/" className="brand">
        padmin
      </Link>
      <h1>Tu acceso</h1>
      <section className="panel">
        <h2>{role ? "Cuenta verificada" : "Acceso no habilitado"}</h2>
        <p>{user.email}</p>
        <p>
          {role
            ? `Rol registrado: ${role === "admin" ? "Administrador" : "Miembro de negocio"}.`
            : "No encontramos una asignación administrativa disponible para esta cuenta."}
        </p>
        <p>
          La edición real no está habilitada. Primero definiremos los permisos y la publicación.
        </p>
        {role && (
          <>
            <h2>Servicios disponibles para tu cuenta</h2>
            {readError ? (
              <p role="alert">No pudimos consultar tus servicios con el acceso actual.</p>
            ) : services.length ? (
              <ul>
                {services.map((service) => (
                  <li key={service.id}>
                    {service.name} · {service.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No hay servicios disponibles.</p>
            )}
            <Link className="button secondary" href={`/vista-previa/${role}`}>
              Explorar el diseño
            </Link>
          </>
        )}
        <SignOut />
      </section>
    </main>
  );
}
