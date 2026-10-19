import { AuthScreen } from "@/components/auth-screen";

// Recupera el modo solicitado sin aceptar roles desde la URL para el acceso real.
export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string }>;
}) {
  const query = await searchParams;
  const initialMode =
    query.modo === "cambiar" ? "change" : query.modo === "temporal" ? "temporary" : "login";
  return <AuthScreen initialMode={initialMode} />;
}
