import { notFound } from "next/navigation";
import { PreviewApplication } from "@/components/preview/application";

// Valida los roles de la vista previa; estos parámetros no otorgan permisos reales.
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string; path?: string[] }>;
  searchParams: Promise<{ categoria?: string; servicio?: string }>;
}) {
  const { role, path = [] } = await params;
  const query = await searchParams;
  if (role !== "admin" && role !== "propietario") notFound();
  return (
    <PreviewApplication
      role={role}
      path={path}
      category={query.categoria}
      parentId={query.servicio}
    />
  );
}
