// Define los datos locales de la vista previa sin mezclarlos con registros de Supabase.
export type PreviewRole = "admin" | "propietario";
export type EntityKind =
  "services" | "businesses" | "owners" | "sites" | "promotions" | "rooms" | "dishes";

export type PreviewPhoto = { id: string; name: string; source?: string; cover: boolean };

export type PreviewEntity = {
  id: string;
  kind: EntityKind;
  name: string;
  status: string;
  category: string;
  business: string;
  fields: Record<string, string>;
  sites: string[];
  photos: PreviewPhoto[];
  parentId?: string;
};

export type PreviewEvent = { id: string; action: string; actor: string; date: string };
export type PreviewData = { entities: PreviewEntity[]; history: PreviewEvent[] };
