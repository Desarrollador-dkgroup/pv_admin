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

export const DEFAULT_CONTRACT_TITLE = "Contrato de colaboración comercial (modelo de prueba)";

export const DEFAULT_CONTRACT_BODY = `CONTRATO DE COLABORACIÓN COMERCIAL (MODELO DE PRUEBA)

Fecha: {{fecha}}
Negocio: {{negocio}}

1. Comisión. Por cada reserva confirmada a través de Panamá Viajero se aplica una comisión base de {{comision_base}}% sobre el precio pagado.

2. Promociones. El propietario puede ofrecer descuentos de hasta {{limite_descuento}}% sin cambios en la comisión base. Si el descuento supera ese límite, la comisión sube lo necesario para conservar una ganancia de {{ganancia_objetivo}} por reserva, sin superar nunca el {{tope_comision}}%.

3. Vigencia. Este documento es un modelo de prueba y se revisará antes de su uso.

Firma del propietario: ________________________

Firma de Panamá Viajero: ________________________`;

export type ContractValues = Record<string, string>;

// Sustituye los marcadores; los que no tienen valor se dejan visibles para revisarlos.
export function renderContract(body: string, values: ContractValues) {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export function contractStatusLabel(status: string) {
  if (status === "signed") return "Firmado";
  if (status === "issued") return "Emitido";
  return "Borrador";
}
