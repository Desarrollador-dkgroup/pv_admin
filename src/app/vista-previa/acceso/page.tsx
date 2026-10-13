import { redirect } from "next/navigation";

// Conserva los enlaces anteriores y concentra el acceso de prueba en la página principal.
export default function PreviewAccess() {
  redirect("/");
}
