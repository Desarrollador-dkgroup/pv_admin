// Contratos por negocio. La plantilla usa marcadores {{clave}} que se llenan al imprimir.

export const CONTRACT_PLACEHOLDERS = [
  { key: "negocio", label: "Nombre del negocio" },
  { key: "comision_base", label: "Comisión base (%)" },
  { key: "limite_descuento", label: "Límite de descuento (%)" },
  { key: "ganancia_objetivo", label: "Ganancia objetivo por reserva" },
  { key: "tope_comision", label: "Tope de comisión (%)" },
  { key: "fecha", label: "Fecha de emisión" },
  { key: "razon_social", label: "Razón social" },
  { key: "ruc", label: "RUC" },
  { key: "representante", label: "Representante legal" },
  { key: "direccion", label: "Dirección legal" },
  { key: "vigencia_inicio", label: "Inicio de vigencia" },
  { key: "vigencia_fin", label: "Fin de vigencia" },
] as const;

// Fecha legible; vacía si el dato no existe.
export function formatContractDate(value: string | null | undefined) {
  if (!value) return "";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("es-PA", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export const DEFAULT_CONTRACT_TITLE = "Contrato de colaboración comercial";

export const DEFAULT_CONTRACT_BODY = `Fecha: {{fecha}}

Entre PANAMÁ VIAJERO, en adelante «la Plataforma», y {{razon_social}}, con RUC {{ruc}}, representada por {{representante}}, con domicilio en {{direccion}}, en adelante «el Negocio», que opera bajo el nombre comercial {{negocio}}, se acuerda lo siguiente:

1. Objeto. El Negocio publica sus servicios en Panamá Viajero para recibir solicitudes y reservas de visitantes.

2. Comisión. Por cada reserva confirmada a través de la Plataforma se aplica una comisión base de {{comision_base}}% sobre el precio pagado.

3. Promociones. El Negocio puede ofrecer descuentos de hasta {{limite_descuento}}% sin cambios en la comisión base. Si el descuento supera ese límite, la comisión sube lo necesario para conservar una ganancia de {{ganancia_objetivo}} por reserva, sin superar nunca el {{tope_comision}}%.

4. Vigencia. Este contrato rige del {{vigencia_inicio}} al {{vigencia_fin}} y se renueva por periodos iguales salvo aviso de cualquiera de las partes con 30 días de anticipación.

5. Firma. El Negocio firma este documento y lo sube en su panel. La Plataforma verifica la firma y lo marca como vigente.


Por el Negocio: ________________________
{{representante}} · Representante legal


Por Panamá Viajero: ________________________`;

export type ContractValues = Record<string, string>;

// Sustituye los marcadores; los que no tienen valor se dejan visibles para revisarlos.
export function renderContract(body: string, values: ContractValues) {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

// Estados en los que las condiciones ya se aplican a las promociones del negocio.
export const ACTIVE_CONTRACT_STATUSES = ["issued", "submitted", "signed"] as const;

export function contractStatusLabel(status: string) {
  if (status === "signed") return "Vigente";
  if (status === "submitted") return "Por verificar";
  if (status === "issued") return "Esperando firma";
  if (status === "void") return "Anulado";
  return "Borrador";
}

export function contractStatusTone(status: string | null | undefined) {
  if (status === "signed") return "success" as const;
  if (status === "submitted") return "info" as const;
  if (status === "issued") return "warning" as const;
  if (status === "void") return "danger" as const;
  return "neutral" as const;
}
