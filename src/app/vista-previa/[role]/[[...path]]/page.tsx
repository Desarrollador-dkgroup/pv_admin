import { redirect } from "next/navigation";

// Evita que las rutas ilustrativas sigan pareciendo un panel conectado.
export default function PreviewPage() {
  redirect("/panel");
}
