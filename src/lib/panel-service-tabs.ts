// Pestañas de la ficha de un servicio; la de habitaciones solo existe en hospedajes.
export function serviceTabItems(service: { id: string; category_id: string }) {
  const id = service.id;
  return [
    { id: "ficha", label: "Ficha del servicio", href: `/panel/servicios/${id}` },
    ...(service.category_id === "hospedaje"
      ? [{ id: "habitaciones", label: "Habitaciones, tarifas y áreas",
        href: `/panel/servicios/${id}?seccion=habitaciones` }]
      : []),
    { id: "galeria", label: "Galería", href: `/panel/servicios/${id}/galeria` },
    ...(service.category_id === "restaurantes"
      ? [{ id: "menu", label: "Menú", href: `/panel/servicios/${id}/menu` }]
      : []),
    { id: "vista", label: "Vista previa", href: `/panel/servicios/${id}/vista-previa` },
  ];
}
