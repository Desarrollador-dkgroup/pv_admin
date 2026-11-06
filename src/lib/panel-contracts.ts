// Contratos por negocio. La plantilla usa marcadores {{clave}} que se llenan con los datos
// del contrato: columnas propias (datos legales y condiciones) y `contract_fields` (el resto).

import { formatCents } from "@/lib/panel-format";

export type ContractFieldKind = "text" | "number" | "select" | "textarea";

export type ContractField = {
  key: string;
  label: string;
  group: string;
  kind: ContractFieldKind;
  help?: string;
  options?: readonly string[];
  defaultValue?: string;
};

// Datos del contrato que no tienen columna propia. El generador pide cada uno.
export const CONTRACT_FIELDS: readonly ContractField[] = [
  {
    key: "pv_razon_social",
    label: "Razón social de Panamá Viajero",
    group: "Panamá Viajero",
    kind: "text",
  },
  { key: "pv_ruc", label: "RUC de Panamá Viajero", group: "Panamá Viajero", kind: "text" },
  {
    key: "pv_direccion",
    label: "Domicilio de Panamá Viajero",
    group: "Panamá Viajero",
    kind: "text",
  },
  {
    key: "pv_representante",
    label: "Representante legal de Panamá Viajero",
    group: "Panamá Viajero",
    kind: "text",
  },
  {
    key: "pv_correo",
    label: "Correo de Panamá Viajero para avisos",
    group: "Panamá Viajero",
    kind: "text",
  },
  {
    key: "liquidacion_dias",
    label: "Días para liquidar al negocio",
    group: "Pagos y liquidación",
    kind: "number",
    help: "Días calendario.",
    defaultValue: "15",
  },
  {
    key: "liquidacion_evento",
    label: "La liquidación se cuenta desde",
    group: "Pagos y liquidación",
    kind: "select",
    options: ["el check-in del visitante", "la confirmación de la reserva"],
  },
  {
    key: "cancelacion_cargo",
    label: "Costo de los reembolsos a cargo de",
    group: "Pagos y liquidación",
    kind: "select",
    options: ["del Negocio", "de Panamá Viajero", "compartido según la política publicada"],
  },
  {
    key: "plazo_confirmacion_horas",
    label: "Horas para confirmar una solicitud",
    group: "Reservas",
    kind: "number",
    defaultValue: "24",
  },
  {
    key: "plan_detalle",
    label: "Límites del plan (servicios, habitaciones, anuncios)",
    group: "Planes y anuncios",
    kind: "textarea",
    defaultValue: "los Servicios, habitaciones y Anuncios indicados en el anexo tarifario vigente.",
  },
  {
    key: "anuncios_tarifa",
    label: "Costo de los anuncios",
    group: "Planes y anuncios",
    kind: "text",
    help: "Ej. incluida en el Plan, o USD 50 por mes.",
    defaultValue: "incluida en el Plan",
  },
  {
    key: "uso_publicidad",
    label: "Uso del nombre y logo del negocio",
    group: "Publicidad",
    kind: "select",
    options: ["durante la vigencia del contrato", "solo con autorización escrita del Negocio"],
  },
  {
    key: "plazo_meses",
    label: "Plazo del contrato (meses)",
    group: "Vigencia y plazos",
    kind: "number",
    defaultValue: "12",
  },
  {
    key: "preaviso_renovacion_dias",
    label: "Preaviso para no renovar (días)",
    group: "Vigencia y plazos",
    kind: "number",
    defaultValue: "30",
  },
  {
    key: "preaviso_ajuste_dias",
    label: "Preaviso para ajustar la comisión (días)",
    group: "Vigencia y plazos",
    kind: "number",
    defaultValue: "30",
  },
  {
    key: "plazo_subsanar_dias",
    label: "Plazo para subsanar un incumplimiento (días)",
    group: "Vigencia y plazos",
    kind: "number",
    defaultValue: "15",
  },
  {
    key: "confidencialidad_anios",
    label: "Años de confidencialidad tras terminar",
    group: "Confidencialidad y responsabilidad",
    kind: "number",
    defaultValue: "2",
  },
  {
    key: "tope_responsabilidad_meses",
    label: "Meses de comisiones como tope de responsabilidad",
    group: "Confidencialidad y responsabilidad",
    kind: "number",
    defaultValue: "3",
  },
  {
    key: "fuerza_mayor_dias",
    label: "Días para notificar fuerza mayor",
    group: "Confidencialidad y responsabilidad",
    kind: "number",
    defaultValue: "5",
  },
  {
    key: "plazo_controversia_dias",
    label: "Días para resolver una diferencia de común acuerdo",
    group: "Jurisdicción",
    kind: "number",
    defaultValue: "30",
  },
  {
    key: "jurisdiccion",
    label: "Jurisdicción para controversias",
    group: "Jurisdicción",
    kind: "select",
    options: [
      "los tribunales competentes de la ciudad de Panamá",
      "el arbitraje del Centro de Conciliación y Arbitraje de Panamá",
    ],
  },
];

// Datos que salen de columnas propias o se generan solos (fecha, nombre del negocio).
const BASE_PLACEHOLDERS = [
  { key: "fecha", label: "Fecha de emisión" },
  { key: "negocio", label: "Nombre comercial del negocio" },
  { key: "razon_social", label: "Razón social del negocio" },
  { key: "ruc", label: "RUC del negocio" },
  { key: "direccion", label: "Domicilio del negocio" },
  { key: "representante", label: "Representante legal del negocio" },
  { key: "correo_negocio", label: "Correo del negocio para avisos" },
  { key: "comision_base", label: "Comisión base (%)" },
  { key: "limite_descuento", label: "Límite de descuento (%)" },
  { key: "ganancia_objetivo", label: "Ganancia objetivo por reserva" },
  { key: "tope_comision", label: "Tope de comisión (%)" },
  { key: "vigencia_inicio", label: "Inicio de vigencia" },
  { key: "vigencia_fin", label: "Fin de vigencia" },
] as const;

export const CONTRACT_PLACEHOLDERS: readonly { key: string; label: string }[] = [
  ...BASE_PLACEHOLDERS,
  ...CONTRACT_FIELDS.map((field) => ({ key: field.key, label: field.label })),
];

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

// Plantilla vigente para contratos nuevos. Los marcadores {{...}} se llenan en el generador.
export const DEFAULT_CONTRACT_BODY = `CONTRATO DE COLABORACIÓN COMERCIAL Y PUBLICACIÓN EN PANAMÁ VIAJERO

Este contrato se celebra en la ciudad de Panamá, el {{fecha}}, entre:

- {{pv_razon_social}}, con RUC {{pv_ruc}}, domicilio en {{pv_direccion}}, representada por {{pv_representante}}, en adelante «Panamá Viajero»; y
- {{razon_social}}, con RUC {{ruc}}, domicilio en {{direccion}}, representada por {{representante}}, en adelante «el Negocio», que opera el establecimiento {{negocio}}.

Panamá Viajero y el Negocio, en adelante «las Partes», acuerdan lo siguiente.

1. OBJETO
1.1 Este contrato regula la publicación de los Servicios del Negocio en la Plataforma, la gestión de las Reservas, las Comisiones, las Promociones y los Anuncios, y los derechos y obligaciones de cada parte.
1.2 Panamá Viajero actúa como intermediario tecnológico y de promoción. No presta los Servicios ni es parte de la relación entre el Negocio y el visitante, salvo en lo que este contrato dispone sobre cobro y liquidación.
1.3 El Negocio declara que opera legalmente en la República de Panamá y que cuenta con los permisos, licencias y registros que su actividad exige, incluido el registro ante la Autoridad de Turismo de Panamá cuando corresponda.

2. DEFINICIONES
Para efectos de este contrato:
- «Plataforma»: el sitio web y la aplicación de Panamá Viajero, y su panel de administración para negocios.
- «Servicio»: cada oferta publicada por el Negocio en la Plataforma, sea hospedaje, habitación, restaurante, actividad o tour.
- «Reserva»: la solicitud de un visitante confirmada a través de la Plataforma.
- «Precio de venta»: el precio que paga el visitante por una Reserva, con los impuestos aplicables.
- «Comisión»: el porcentaje sobre el Precio de venta que el Negocio reconoce a Panamá Viajero por cada Reserva confirmada.
- «Promoción»: descuento temporal sobre un Servicio o una habitación, con fechas o días de la semana definidos.
- «Anuncio»: pieza publicitaria que Panamá Viajero muestra en sus canales, sujeta a aprobación.
- «Plan»: el conjunto de Servicios y funciones asignado al Negocio según su contratación.

3. PLANES Y SERVICIOS PUBLICABLES
3.1 El Negocio solo puede publicar los Servicios incluidos en su Plan vigente. Los límites del Plan son: {{plan_detalle}}
3.2 Ampliar el Plan requiere aprobación escrita de Panamá Viajero y se formaliza con un anexo firmado.
3.3 Todo Servicio debe corresponder a una operación real del Negocio. Panamá Viajero puede rechazar o retirar publicaciones falsas, duplicadas, engañosas o contrarias a la ley.

4. PRECIO, COMISIONES Y LIQUIDACIÓN
4.1 El Negocio fija libremente el precio regular de sus Servicios y debe mantenerlo actualizado en la Plataforma.
4.2 Por cada Reserva confirmada, el Negocio reconoce a Panamá Viajero una Comisión base de {{comision_base}}% sobre el Precio de venta.
4.3 Panamá Viajero cobra el Precio de venta al visitante y liquida al Negocio el monto neto, descontada la Comisión y los cargos bancarios o de pasarela de pago aplicables. La liquidación se hace {{liquidacion_dias}} días después de {{liquidacion_evento}}, por transferencia a la cuenta registrada por el Negocio.
4.4 El ITBMS y demás impuestos se aplican conforme al Código Fiscal de la República de Panamá. Cada parte responde por sus propias obligaciones tributarias. Cuando la ley exija una retención, Panamá Viajero la aplicará y entregará el comprobante correspondiente.
4.5 Panamá Viajero puede ajustar la Comisión base con {{preaviso_ajuste_dias}} días de preaviso. El ajuste no afecta las Reservas ya confirmadas.

5. PROMOCIONES Y LÍMITE DE DESCUENTO
5.1 El Negocio puede crear Promociones de hasta {{limite_descuento}}% sobre el precio regular de un Servicio o de una habitación, con fechas de inicio y fin o con días de la semana.
5.2 Mientras la Promoción esté dentro de ese límite, la Comisión base no cambia.
5.3 Si la Promoción supera el límite, la Comisión sube solo lo necesario para que Panamá Viajero conserve una ganancia mínima de {{ganancia_objetivo}} por Reserva, sin superar el tope de {{tope_comision}}%. Si el tope no permite esa ganancia, la Promoción no se publica.
5.4 Cada Reserva aplica automáticamente la Promoción vigente en cada noche o fecha de la estancia, y el visitante ve ese precio antes de confirmar.
5.5 El Negocio no puede cobrar al visitante más del precio publicado ni negarle una Promoción vigente que aplique a su Reserva.

6. ANUNCIOS
6.1 El Negocio puede solicitar Anuncios desde su panel, indicando la imagen, la Promoción asociada y las fechas de publicación.
6.2 Panamá Viajero revisa cada solicitud y decide si la aprueba, la modifica o la rechaza. Al aprobarla, publica el Anuncio en las fechas acordadas.
6.3 Publicación de Anuncios: {{anuncios_tarifa}}.
6.4 El Negocio garantiza que la imagen y el texto del Anuncio cumplen la ley y no infringen derechos de terceros. Panamá Viajero puede retirar un Anuncio que incumpla la ley o sus políticas.

7. RESERVAS, CANCELACIONES Y REEMBOLSOS
7.1 El Negocio debe confirmar o declinar cada solicitud dentro de {{plazo_confirmacion_horas}} horas. Las solicitudes sin respuesta en ese plazo se consideran declinadas.
7.2 Cancelación por el visitante: aplica la política publicada en cada Servicio. Los reembolsos se calculan con esa política y los procesa Panamá Viajero. El costo de los reembolsos es {{cancelacion_cargo}}.
7.3 Cancelación por el Negocio: debe avisar de inmediato a Panamá Viajero y al visitante. Panamá Viajero reembolsa al visitante el total pagado y puede descontar ese monto de liquidaciones futuras.
7.4 Ninguna parte puede cobrar al visitante por fuera de la Plataforma una Reserva confirmada en ella.

8. OBLIGACIONES DEL NEGOCIO
El Negocio se obliga a:
- honrar las Reservas confirmadas y prestar sus Servicios con la calidad, seguridad y atención publicadas;
- mantener actualizados disponibilidad, horarios, precios y Promociones;
- cumplir las normas de turismo, sanitarias, de seguridad y de protección al consumidor aplicables en Panamá, incluida la Ley 45 de 2007 cuando corresponda;
- tratar con respeto a los visitantes y atender sus quejas por los canales indicados;
- mantener vigentes sus permisos y registros, y avisar a Panamá Viajero de cualquier suspensión.

9. OBLIGACIONES DE PANAMÁ VIAJERO
Panamá Viajero se obliga a:
- mantener la Plataforma disponible con un esfuerzo razonable de continuidad, y avisar con anticipación de los mantenimientos programados;
- publicar los Servicios y Promociones conforme a este contrato;
- liquidar al Negocio en los plazos acordados;
- proteger la información conforme a la cláusula 11;
- atender las reclamaciones de los visitantes que lleguen a la Plataforma y trasladarlas al Negocio.

10. CONTENIDO Y PROPIEDAD INTELECTUAL
10.1 El Negocio garantiza que tiene derecho a publicar las fotografías, textos, marcas y demás contenidos que suba a la Plataforma, y que no infringen derechos de terceros.
10.2 El Negocio otorga a Panamá Viajero una licencia no exclusiva, gratuita y limitada a la vigencia de este contrato, para reproducir, adaptar y mostrar esos contenidos en la Plataforma y en sus canales de promoción, incluidos los Anuncios.
10.3 Panamá Viajero puede usar el nombre comercial y el logo del Negocio para promocionarse {{uso_publicidad}}.
10.4 Las marcas, logotipos, diseño y software de Panamá Viajero son de su propiedad. El Negocio no adquiere derechos sobre ellos.

11. PROTECCIÓN DE DATOS PERSONALES
11.1 Las Partes tratarán los datos personales de los visitantes conforme a la Ley 81 de 2019 sobre Protección de Datos Personales y sus normas reglamentarias.
11.2 Cada parte es responsable de los datos que recibe en el marco de la Reserva para sus propias finalidades: Panamá Viajero, para la Plataforma, el cobro y la liquidación; el Negocio, para prestar el Servicio reservado.
11.3 El Negocio usará los datos de la Reserva solo para prestar el Servicio. No los cede ni los usa con fines de mercadeo sin el consentimiento del visitante.
11.4 Las Partes adoptarán medidas de seguridad razonables y se notificarán sin demora cualquier incidente que afecte datos personales.

12. CONFIDENCIALIDAD
Las Partes mantendrán en reserva las condiciones económicas de este contrato y la información no pública que reciban en virtud de él, y solo la usarán para ejecutarlo. Esta obligación subsiste por {{confidencialidad_anios}} años después de terminado el contrato. No aplica a la información pública ni a la que deba revelarse por orden de autoridad competente.

13. RESPONSABILIDAD Y GARANTÍAS
13.1 El Negocio responde frente al visitante por la prestación de sus Servicios.
13.2 Panamá Viajero no garantiza resultados comerciales, volumen de Reservas ni disponibilidad ininterrumpida de servicios de terceros.
13.3 Ninguna parte responderá por daños indirectos, lucro cesante o pérdida de oportunidades, salvo dolo o culpa grave.
13.4 La responsabilidad total de Panamá Viajero frente al Negocio no excederá las Comisiones recibidas en los {{tope_responsabilidad_meses}} meses anteriores al hecho que la origine.
13.5 Nada de lo anterior limita los derechos irrenunciables que la ley de protección al consumidor reconoce a los visitantes.

14. FUERZA MAYOR
Ninguna parte responderá por el incumplimiento causado por fuerza mayor o caso fortuito, en los términos del Código Civil de la República de Panamá, siempre que lo notifique por escrito a la otra parte dentro de {{fuerza_mayor_dias}} días hábiles desde que ocurra.

15. VIGENCIA, RENOVACIÓN Y TERMINACIÓN
15.1 Este contrato rige desde el {{vigencia_inicio}} hasta el {{vigencia_fin}}, por un plazo de {{plazo_meses}} meses.
15.2 Se renueva automáticamente por periodos iguales, salvo que una parte notifique su decisión de no renovar con {{preaviso_renovacion_dias}} días de anticipación.
15.3 Cualquiera de las partes puede dar por terminado el contrato por incumplimiento grave de la otra que no se subsane en {{plazo_subsanar_dias}} días calendario desde la notificación escrita.
15.4 Panamá Viajero puede suspender de inmediato la publicación de los Servicios por fraude, incumplimiento de la ley o de sus políticas, y avisará al Negocio por escrito.
15.5 La terminación no afecta las Reservas confirmadas ni las obligaciones de pago pendientes, incluida la liquidación de las Reservas ya realizadas.

16. NOTIFICACIONES Y FIRMA ELECTRÓNICA
16.1 Las notificaciones se harán por escrito al correo del Negocio registrado en la Plataforma ({{correo_negocio}}) y a Panamá Viajero en {{pv_correo}}, o mediante el panel de administración.
16.2 Las Partes aceptan firmar este contrato por medios electrónicos, conforme a la Ley 51 de 2008 sobre documentos electrónicos y firma electrónica, o con firma manuscrita en documento físico si así lo acuerdan.
16.3 Cada parte declara que su representante tiene facultades para obligarla en este acto.

17. LEY APLICABLE Y JURISDICCIÓN
17.1 Este contrato se rige por las leyes de la República de Panamá.
17.2 Las controversias que no se resuelvan de común acuerdo en {{plazo_controversia_dias}} días desde la notificación se someterán a {{jurisdiccion}}.

18. DISPOSICIONES GENERALES
18.1 Este contrato, con sus anexos, es el acuerdo completo entre las Partes sobre su objeto y reemplaza cualquier acuerdo previo.
18.2 Toda modificación debe constar por escrito y firmarse por ambas partes, salvo los ajustes de Comisión previstos en la cláusula 4.5 y los cambios de Plan aprobados por escrito.
18.3 Si una disposición resultara nula, las demás mantienen su vigencia.
18.4 La tolerancia de una parte no implica renuncia a sus derechos.
18.5 El Negocio no puede ceder este contrato sin autorización escrita de Panamá Viajero.

Leído y aceptado, en señal de conformidad, las Partes firman este contrato en dos ejemplares de igual tenor, o electrónicamente conforme a la cláusula 16.2.


_______________________________          _______________________________
{{razon_social}}                         PANAMÁ VIAJERO
Representante legal: {{representante}}   Representante legal: {{pv_representante}}
Fecha: ____________________              Fecha: ____________________
`;

export type ContractValues = Record<string, string>;

// Los datos de un contrato tal como vienen de la base (columnas y `contract_fields`).
export type ContractRow = {
  legal_name: string | null;
  tax_id: string | null;
  legal_representative: string | null;
  legal_address: string | null;
  contact_email: string | null;
  starts_on: string | null;
  ends_on: string | null;
  base_commission_pct: number | string;
  discount_limit_pct: number | string;
  target_profit_cents: number | string;
  commission_cap_pct: number | string;
  contract_fields?: Record<string, unknown> | null;
};

// Solo los datos de texto de `contract_fields`, con los campos conocidos.
export function contractFieldsFrom(raw: Record<string, unknown> | null | undefined): Record<string, string> {
  const known = new Set(CONTRACT_FIELDS.map((field) => field.key));
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (known.has(key) && typeof value === "string") out[key] = value;
  }
  return out;
}

// Valores iniciales de los campos: lo guardado o el valor por defecto de cada uno.
export function contractFieldDefaults(raw: Record<string, unknown> | null | undefined) {
  const saved = contractFieldsFrom(raw);
  const out: Record<string, string> = {};
  for (const field of CONTRACT_FIELDS) {
    out[field.key] = saved[field.key] ?? field.defaultValue ?? field.options?.[0] ?? "";
  }
  return out;
}

// Todos los valores que usa el documento, a partir de los datos del contrato.
export function contractValuesFor(
  contract: ContractRow,
  businessName: string,
  dateLabel: string,
): ContractValues {
  return {
    ...contractFieldsFrom(contract.contract_fields),
    fecha: dateLabel,
    negocio: businessName,
    razon_social: contract.legal_name ?? businessName,
    ruc: contract.tax_id ?? "",
    direccion: contract.legal_address ?? "",
    representante: contract.legal_representative ?? "",
    correo_negocio: contract.contact_email ?? "",
    vigencia_inicio: formatContractDate(contract.starts_on),
    vigencia_fin: formatContractDate(contract.ends_on),
    comision_base: String(Number(contract.base_commission_pct)),
    limite_descuento: String(Number(contract.discount_limit_pct)),
    ganancia_objetivo: formatCents(Number(contract.target_profit_cents)),
    tope_comision: String(Number(contract.commission_cap_pct)),
  };
}

// Sustituye los marcadores; los que no tienen valor se dejan visibles para revisarlos.
export function renderContract(body: string, values: ContractValues) {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

// Trozos del contrato para mostrarlos con color: texto fijo, dato llenado o marcador vacío.
export type ContractPart = { text: string; kind: "text" | "data" | "missing" };

export function renderContractParts(body: string, values: ContractValues): ContractPart[] {
  const parts: ContractPart[] = [];
  let last = 0;
  for (const match of body.matchAll(/\{\{(\w+)\}\}/g)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: body.slice(last, index), kind: "text" });
    const value = values[match[1]];
    parts.push(value ? { text: value, kind: "data" } : { text: match[0], kind: "missing" });
    last = index + match[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last), kind: "text" });
  return parts;
}

// Claves usadas en la plantilla que todavía no tienen valor (en el orden de aparición).
export function missingContractKeys(body: string, values: ContractValues): string[] {
  const used = [...body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
  return [...new Set(used)].filter((key) => !values[key]?.trim());
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
