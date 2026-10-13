import type { PreviewEntity } from "../types/preview";

// Recupera las categorías del negocio desde su registro y sus servicios asociados.
export function getBusinessCategories(entity: PreviewEntity, entities: PreviewEntity[]) {
  return [
    ...new Set([
      ...(entity.category ? [entity.category] : []),
      ...entities
        .filter((record) => record.kind === "services" && record.business === entity.name)
        .map((record) => record.category)
        .filter(Boolean),
    ]),
  ];
}

// Muestra el propietario del negocio aunque los registros locales sean de una versión anterior.
export function getBusinessOwner(entity: PreviewEntity, entities: PreviewEntity[]) {
  return (
    entity.fields.owner ||
    entities.find((record) => record.kind === "owners" && record.business === entity.name)?.name ||
    "Sin asignar"
  );
}
