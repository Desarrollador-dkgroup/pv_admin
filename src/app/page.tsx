import { redirect } from "next/navigation";

// Envía la ruta principal al único formulario de acceso real.
export default function HomePage() {
  redirect("/acceso");
}
