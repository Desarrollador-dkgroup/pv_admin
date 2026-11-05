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

export const DEFAULT_CONTRACT_TITLE = "Contrato de colaboración comercial y publicación en Panamá Viajero";

// Plantilla base. Los marcadores {{...}} se completan con los datos del negocio.
// Debe ser revisada por un abogado antes de usarse con clientes.
export const DEFAULT_CONTRACT_BODY = `CONTRATO DE COLABORACIÓN COMERCIAL Y PUBLICACIÓN DE SERVICIOS

Este contrato se celebra en la ciudad de Panamá, el {{fecha}}, entre:

(1) PANAMÁ VIAJERO, en adelante «LA PLATAFORMA», plataforma digital de promoción y reserva de servicios turísticos en Panamá; y

(2) {{razon_social}}, sociedad debidamente constituida conforme a las leyes de la República de Panamá, con RUC {{ruc}}, con domicilio en {{direccion}}, representada legalmente por {{representante}}, en adelante «EL NEGOCIO», que opera el establecimiento comercial denominado {{negocio}}.

LA PLATAFORMA y EL NEGOCIO, en adelante conjuntamente «LAS PARTES», acuerdan lo siguiente:

PRIMERA. ANTECEDENTES. EL NEGOCIO ofrece servicios turísticos en la República de Panamá y desea publicarlos en la plataforma de LA PLATAFORMA para recibir solicitudes y reservas de visitantes. LA PLATAFORMA cuenta con la infraestructura tecnológica, la base de usuarios y los mecanismos de cobro necesarios para ello.

SEGUNDA. DEFINICIONES. Para efectos de este contrato se entiende por: (a) «Servicio»: cada oferta publicada por EL NEGOCIO en la plataforma, incluyendo hospedajes, habitaciones, restaurantes, actividades y tours; (b) «Reserva»: la solicitud confirmada por un visitante a través de la plataforma; (c) «Promoción»: un descuento temporal sobre un Servicio o sobre una habitación específica; (d) «Anuncio»: pieza publicitaria mostrada por LA PLATAFORMA en su página principal.

TERCERA. OBJETO. El presente contrato regula la publicación de los Servicios de EL NEGOCIO, las comisiones aplicables a cada Reserva, el régimen de Promociones y Anuncios, y los derechos y obligaciones de cada parte durante su vigencia.

CUARTA. PLAN DE SERVICIOS. EL NEGOCIO podrá publicar únicamente los Servicios incluidos en el plan asignado por LA PLATAFORMA. La ampliación del plan requiere aprobación escrita de LA PLATAFORMA. Los Servicios publicados deben corresponder a establecimientos y experiencias que EL NEGOCIO opere efectivamente.

QUINTA. COMISIÓN Y PRECIOS. Por cada Reserva confirmada a través de la plataforma, EL NEGOCIO reconoce a LA PLATAFORMA una comisión base de {{comision_base}}% sobre el precio pagado por el visitante. EL NEGOCIO fija libremente el precio regular de sus Servicios, sin perjuicio de lo dispuesto en la cláusula siguiente.

SEXTA. PROMOCIONES Y LÍMITE DE DESCUENTO. EL NEGOCIO puede ofrecer Promociones de hasta {{limite_descuento}}% sobre el precio regular sin que cambie la comisión base. Cuando una Promoción supere ese límite, la comisión aplicable se incrementará únicamente en la medida necesaria para que LA PLATAFORMA conserve una ganancia de {{ganancia_objetivo}} por Reserva, sin que la comisión supere en ningún caso el {{tope_comision}}%. Ninguna Promoción podrá publicarse si la comisión resultante excediera ese tope. Las Promociones aplican únicamente al Servicio o a la habitación indicados al crearlas, y deben cumplir las condiciones publicadas.

SÉPTIMA. ANUNCIOS. Los Anuncios se solicitan por EL NEGOCIO, se revisan por LA PLATAFORMA y se publican en las fechas acordadas. LA PLATAFORMA decide su publicación final y puede retirarlos si incumplen la ley, las políticas de la plataforma o el contenido de la Promoción a la que enlazan.

OCTAVA. RESERVAS Y SERVICIO AL VISITANTE. EL NEGOCIO se obliga a honrar las Reservas confirmadas, a mantener la disponibilidad, los horarios y las tarifas publicadas, y a prestar sus servicios con la calidad, seguridad y atención acordadas. Cualquier cambio de disponibilidad o precio deberá reflejarse en la plataforma con la debida anticipación.

NOVENA. PAGOS Y LIQUIDACIÓN. LA PLATAFORMA cobrará el precio de cada Reserva y liquidará a EL NEGOCIO el monto neto después de descontar la comisión aplicable y los cargos bancarios correspondientes. Las fechas y el medio de liquidación se detallan en el anexo de liquidación que LA PLATAFORMA comunique a EL NEGOCIO. EL NEGOCIO es responsable de los impuestos que le correspondan conforme a la legislación panameña, incluido el ITBMS cuando aplique.

DÉCIMA. CONTENIDO Y PROPIEDAD INTELECTUAL. EL NEGOCIO garantiza que tiene derecho a publicar las fotografías, textos, marcas y demás contenidos que suba a la plataforma, y que estos no infringen derechos de terceros. EL NEGOCIO otorga a LA PLATAFORMA una licencia no exclusiva, por la vigencia de este contrato, para reproducir y mostrar dichos contenidos en sus canales. Las marcas y elementos de LA PLATAFORMA siguen siendo de su propiedad.

DÉCIMA PRIMERA. PROTECCIÓN DE DATOS PERSONALES. Las partes tratarán los datos personales de los visitantes conforme a la Ley 81 de 2019 de Protección de Datos Personales de la República de Panamá y a sus normas reglamentarias. EL NEGOCIO usará los datos de las Reservas únicamente para prestar el servicio contratado y no los compartirá con terceros para fines distintos.

DÉCIMA SEGUNDA. CONFIDENCIALIDAD. Las partes se obligan a mantener la confidencialidad de las condiciones económicas de este contrato y de la información no pública que reciban en virtud del mismo, salvo requerimiento de autoridad competente.

DÉCIMA TERCERA. RESPONSABILIDAD. LA PLATAFORMA actúa como intermediaria tecnológica y no es prestadora de los Servicios. EL NEGOCIO responde directamente frente al visitante por la prestación de sus Servicios, sin perjuicio de las obligaciones de LA PLATAFORMA derivadas de la ley. Ninguna de las partes será responsable por daños indirectos o lucro cesante.

DÉCIMA CUARTA. FUERZA MAYOR. Ninguna parte será responsable por el incumplimiento causado por fuerza mayor o caso fortuito, según el Código Civil de Panamá, siempre que lo notifique con prontitud a la otra parte.

DÉCIMA QUINTA. VIGENCIA. Este contrato rige desde el {{vigencia_inicio}} hasta el {{vigencia_fin}}. Se renovará automáticamente por periodos iguales, salvo que cualquiera de las partes notifique su voluntad de no renovarlo con al menos treinta (30) días de anticipación.

DÉCIMA SEXTA. TERMINACIÓN. Cualquiera de las partes podrá dar por terminado este contrato por incumplimiento grave de la otra que no sea subsanado dentro de los quince (15) días siguientes a su notificación escrita. LA PLATAFORMA podrá suspender de inmediato la publicación de los Servicios en caso de fraude, incumplimiento de la ley o de sus políticas. La terminación no afecta las Reservas confirmadas ni las obligaciones de pago pendientes.

DÉCIMA SÉPTIMA. NOTIFICACIONES. Las notificaciones entre las partes se harán por escrito al correo electrónico de contacto de EL NEGOCIO y a la dirección de LA PLATAFORMA, o mediante el panel de administración de la plataforma.

DÉCIMA OCTAVA. LEY APLICABLE Y JURISDICCIÓN. Este contrato se rige por las leyes de la República de Panamá. Cualquier controversia que no pueda resolverse de común acuerdo se someterá a los tribunales competentes de la ciudad de Panamá, con renuncia a cualquier otro fuero.

DÉCIMA NOVENA. DISPOSICIONES GENERALES. Este contrato, junto con sus anexos, constituye el acuerdo íntegro entre las partes sobre su objeto y reemplaza cualquier acuerdo previo. Cualquier modificación deberá constar por escrito y firmada por ambas partes. Si alguna disposición resultara nula, las demás mantendrán su plena vigencia.

Leído y aceptado por las partes, en señal de conformidad, se firma en dos ejemplares de igual tenor.


_______________________________          _______________________________
{{razon_social}}                         PANAMÁ VIAJERO
Representante legal: {{representante}}   Representante legal autorizado
Fecha: ____________________              Fecha: ____________________
`;

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
