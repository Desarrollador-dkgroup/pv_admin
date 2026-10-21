import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/ui";
import { SERVICE_STATUS, statusOf } from "@/lib/panel-labels";
import { getPanelIdentity } from "@/lib/panel-access";

// Portada de un hospedaje: reúne accesos a sus editores reales en vez de un único
// formulario técnico. El propietario elige qué parte de la ficha completar primero.
export default async function LodgingCoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, role, businessIds } = await getPanelIdentity();
  const { data: service, error } = await supabase
    .from("services")
    .select("id, name, status, category_id, business_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !service || role === "collaborator" ||
    (role === "propietario" && !businessIds.includes(service.business_id))) notFound();

  // La portada solo tiene sentido para hospedaje; otras categorías van directo al editor.
  if (service.category_id !== "hospedaje") redirect(`/panel/servicios/${id}`);

  const status = statusOf(SERVICE_STATUS, service.status);

  const sections = [
    {
      href: `/panel/servicios/${id}`,
      title: "Datos y ubicación",
      description: "Nombre, dirección, mapa, comodidades y precio desde.",
    },
    {
      href: `/panel/servicios/${id}/galeria`,
      title: "Galería",
      description: "Fotos generales, de cada área y de cada habitación.",
    },
    {
      href: `/panel/servicios/${id}/unidades#habitaciones`,
      title: "Habitaciones y tarifas",
      description: "Unidades reservables, precios y temporadas.",
    },
    {
      href: `/panel/servicios/${id}/unidades#areas`,
      title: "Áreas e instalaciones",
      description: "Espacios comunes y sus propias fotos.",
    },
  ];

  return (
    <>
      <header className="page-heading">
        <div>
          <h1>{service.name || "Hospedaje sin nombre"}</h1>
          <p>Elige qué parte de la ficha completar.</p>
        </div>
        <span className={`badge tone-${status.tone}`}>{status.label}</span>
      </header>
      <div className="merchant-preview-callout">
        <div>
          <strong>Así va quedando tu ficha</strong>
          <p>Revisa los datos y las fotos guardadas antes de enviarla a revisión.</p>
        </div>
        <Link className="button primary" href={`/panel/servicios/${id}/vista-previa`}>
          Ver vista previa
        </Link>
      </div>
      <div className="owner-grid">
        {sections.map((section) => (
          <Panel key={section.href}>
            <h2>{section.title}</h2>
            <p className="muted">{section.description}</p>
            <Link className="button secondary" href={section.href}>
              Abrir
            </Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
