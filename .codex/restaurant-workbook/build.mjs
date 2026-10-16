import fs from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(
  "C:/Users/deept/.cache/codex-runtimes/codex-primary-runtime/"
  + "dependencies/node/node_modules/workbook-builder.cjs",
);
const { SpreadsheetFile, Workbook } = require("@oai/artifact-tool");

const outputDir = "C:/Users/deept/pv_admin/outputs/restaurant-info";
const workbook = Workbook.create();

const ficha = workbook.worksheets.add("Ficha restaurante");
const reservations = workbook.worksheets.add("Reservas y menú");
const gallery = workbook.worksheets.add("Galería y modelo");

const brandBlue = "#4956A2";
const accentRed = "#CD2E4C";
const lightBlue = "#EEF0FA";
const paleRed = "#FCECEF";
const darkText = "#20243A";

function applySheetStyle(sheet, lastColumn, lastRow) {
  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastColumn}${lastRow}`).format.font = {
    name: "Arial",
    size: 10,
    color: darkText,
  };
  sheet.getRange(`A1:${lastColumn}1`).format.rowHeight = 8;
  sheet.getRange(`A2:${lastColumn}2`).format.font = {
    name: "Arial",
    size: 16,
    bold: true,
    color: brandBlue,
  };
  sheet.getRange(`A2:${lastColumn}2`).format.rowHeight = 28;
  sheet.getRange(`A3:${lastColumn}3`).format.font = {
    name: "Arial",
    size: 10,
    italic: true,
    color: "#555B72",
  };
  sheet.getRange(`A5:${lastColumn}5`).format.fill = brandBlue;
  sheet.getRange(`A5:${lastColumn}5`).format.font = {
    name: "Arial",
    size: 10,
    bold: true,
    color: "#FFFFFF",
  };
  sheet.getRange(`A5:${lastColumn}${lastRow}`).format.wrapText = true;
  sheet.getRange(`A5:${lastColumn}${lastRow}`).format.verticalAlignment = "center";
  sheet.getRange(`A5:${lastColumn}5`).format.horizontalAlignment = "center";
  sheet.getRange(`A5:${lastColumn}${lastRow}`).format.rowHeight = 32;
  sheet.freezePanes.freezeRows(5);
}

function setColumnWidths(sheet, widths) {
  widths.forEach((width, index) => {
    const column = String.fromCharCode(65 + index);
    sheet.getRange(`${column}:${column}`).format.columnWidth = width;
  });
}

const fichaHeaders = [
  "Sección",
  "Campo",
  "Información que se registra",
  "Ejemplo",
  "Requerido",
  "Estado en Supabase",
  "Tabla / campo o recomendación",
];

const fichaRows = [
  ["Identidad", "Nombre comercial", "Nombre público del restaurante.", "Restaurante Bahía", "Sí", "Existe", "services.name"],
  ["Identidad", "Descripción corta", "Resumen para tarjetas y resultados.", "Cocina local con vista al mar.", "Sí", "Existe", "services.search_description"],
  ["Identidad", "Descripción completa", "Presentación, propuesta y detalles del local.", "Menú panameño y mariscos frescos.", "Sí", "Existe", "services.description"],
  ["Identidad", "Categoría del servicio", "Identifica el servicio como restaurante.", "Restaurante", "Sí", "Existe", "services.category_id → categories.id"],
  ["Identidad", "Estilo de atención", "Atención en mesa, informal o casual; no crea formatos separados.", "Servicio en mesa, ambiente casual.", "Sí", "Por definir", "Puede guardarse como atributo de perfil si el catálogo lo necesita."],
  ["Identidad", "Tipo de cocina", "Especialidad culinaria principal del restaurante.", "Panameña y mariscos", "Sí", "Parcial", "restaurant_profiles.tag es texto libre; conviene definir si será etiqueta o catálogo."],
  ["Negocio", "Negocio propietario", "Negocio al que pertenece el servicio.", "Restaurante Bahía, S. A.", "Sí", "Existe", "services.business_id → businesses.id"],
  ["Ubicación", "Provincia", "Provincia donde opera el restaurante.", "Panamá", "Sí", "Existe por relación", "services.city_id → cities.province_id"],
  ["Ubicación", "Ciudad", "Ciudad o distrito asociado al servicio.", "Ciudad de Panamá", "Sí", "Existe", "services.city_id → cities.id"],
  ["Ubicación", "Sitio turístico", "Sitio turístico cercano para búsquedas por destino.", "Casco Antiguo", "No", "Existe uno", "services.tourist_site_id; la relación múltiple propuesta aún requiere migración."],
  ["Ubicación", "Dirección o referencia", "Referencia legible para encontrar el local.", "Calle 3, frente a la plaza.", "Sí", "Parcial", "services.area_label; confirmar si basta o si se requiere address en businesses."],
  ["Ubicación", "Coordenadas", "Ubicación precisa para mapa y navegación.", "8.9521, -79.5352", "No", "Existe", "services.latitude y services.longitude"],
  ["Ubicación", "Enlace o consulta de mapa", "Texto o URL para abrir la ubicación en mapas.", "Restaurante Bahía, Casco Antiguo", "No", "Existe", "services.maps_query"],
  ["Contacto", "Teléfono de reservas", "Número de contacto para consultas o reservas.", "+507 6000-0000", "Recomendado", "No aparece", "Definir campo de contacto público en services o businesses."],
  ["Contacto", "Correo de contacto", "Correo visible para consultas del restaurante.", "reservas@bahia.pa", "No", "No aparece", "Definir campo si el sistema expondrá correo público."],
  ["Contacto", "Sitio web o redes", "Enlaces oficiales del restaurante.", "https://ejemplo.pa", "No", "No aparece", "Se recomienda tabla business_links o campos estructurados."],
  ["Operación", "Horario semanal", "Apertura y cierre por día; permite días cerrados y pausas.", "Lun-vie 12:00-22:00", "Sí", "Insuficiente", "restaurant_profiles.hours_from/to solo guarda un rango; crear restaurant_hours por día y turno."],
  ["Operación", "Días cerrados", "Días sin servicio para reservar.", "Martes", "Sí", "No aparece", "Incluir is_closed por día en restaurant_hours."],
  ["Operación", "Métodos de pago", "Medios aceptados en el local.", "Efectivo, tarjeta, Yappy", "Sí", "Existe", "restaurant_profiles.payment_methods (arreglo de texto)."],
  ["Operación", "Moneda", "Moneda usada para precios del menú.", "USD", "Sí", "Existe", "services.currency y menu_dishes.price_cents."],
  ["Operación", "Precio promedio", "Rango orientativo para que el cliente compare.", "$10-$20 por persona", "Recomendado", "Parcial", "services.cached_price_from_cents; definir si representa mínimo o promedio."],
  ["Operación", "Estado de publicación", "Controla si el servicio está en borrador, publicado o suspendido.", "published", "Sí", "Existe", "services.status."],
  ["Reservas", "Acepta reservas", "Indica si el restaurante admite reservas en la plataforma.", "Sí", "Sí", "No aparece", "Agregar campo accepts_reservations en el perfil o servicio."],
  ["Reservas", "Capacidad por turno", "Cantidad máxima de personas o reservas por intervalo.", "24 personas por turno", "Recomendado", "No aparece", "Definir modelo de capacidad antes de automatizar disponibilidad."],
  ["Reservas", "Duración estimada", "Tiempo reservado para cada mesa o turno.", "90 minutos", "Recomendado", "No aparece", "Puede ser configuración del restaurante o de cada turno."],
  ["Reservas", "Anticipación mínima", "Tiempo requerido antes de aceptar una reserva.", "2 horas", "Recomendado", "No aparece", "Agregar política de reserva si el flujo la requiere."],
  ["Reservas", "Ventana de reserva", "Con cuántos días de anticipación puede reservarse.", "Hasta 30 días", "Recomendado", "No aparece", "Agregar política de reserva si el flujo la requiere."],
  ["Reservas", "Tamaño mínimo y máximo", "Cantidad de personas aceptada por solicitud.", "1 a 8 personas", "Recomendado", "Parcial", "reservations.guests guarda la cantidad, pero los límites no están definidos."],
  ["Reservas", "Confirmación", "Define si la reserva se confirma automáticamente o requiere aceptación.", "Requiere confirmación del local", "Recomendado", "Parcial", "reservations.status incluye pending y accepted; falta configuración del servicio."],
  ["Reservas", "Política de cancelación", "Plazo y condiciones para cancelar una mesa.", "Cancelar hasta 2 horas antes", "Recomendado", "Parcial", "reservations incluye estados y cancelación, pero no la política."],
  ["Experiencia", "Características", "Atributos que ayudan a filtrar restaurantes.", "Terraza, aire acondicionado", "No", "Existe catálogo", "restaurant_service_features → restaurant_feature_catalog."],
  ["Experiencia", "Accesibilidad", "Detalles útiles de acceso para personas con movilidad reducida.", "Entrada sin escalones", "Recomendado", "Parcial", "Puede expresarse con características; revisar catálogo de features."],
  ["Experiencia", "Ambiente", "Descripción breve del entorno y ocasión.", "Familiar, informal", "No", "Parcial", "Puede usar services.area_label/tag solo tras definir su significado."],
  ["Menú", "Secciones del menú", "Agrupación de platos por tipo o momento.", "Entradas, platos fuertes, bebidas", "Sí", "Existe", "menu_sections.title y position."],
  ["Menú", "Platos", "Nombre, descripción, precio y orden de cada plato.", "Ceviche mixto, descripción, $12.00", "Sí", "Existe", "menu_dishes.name, description, price_cents y position."],
  ["Menú", "Disponibilidad del plato", "Permite indicar platos temporalmente agotados.", "Disponible / agotado", "Recomendado", "No aparece", "Agregar is_available a menu_dishes si se gestionará desde padmin."],
  ["Menú", "Dietas y alérgenos", "Indica ingredientes o restricciones relevantes.", "Contiene gluten; opción vegetariana", "Recomendado", "No aparece", "Definir atributos estructurados si habrá filtros dietarios."],
  ["Galería", "Fotos del restaurante", "Galería ordenada con una imagen de portada.", "Portada, salón, terraza, platos", "Preparar", "Existe relación", "service_photos: storage_path, is_cover, alt_text, position."],
  ["Galería", "Texto alternativo", "Descripción accesible de cada imagen.", "Terraza del restaurante al atardecer", "Recomendado", "Existe", "service_photos.alt_text."],
  ["Gestión", "Recomendado", "Permite destacar el servicio en la plataforma.", "Sí / No", "No", "Existe", "services.is_recommended."],
  ["Gestión", "Fecha de creación y actualización", "Audita los cambios del registro.", "Fecha automática", "Automático", "Existe", "services.created_at y updated_at."],
];

ficha.getRange("A2:G2").merge();
ficha.getRange("A2").values = [["Ficha de información para restaurantes"]];
ficha.getRange("A3:G3").merge();
ficha.getRange("A3").values = [[
  "Alcance: restaurantes con servicio en mesa, ya sea formal o casual, y gestión basada en reservas.",
]];
ficha.getRange("A5:G5").values = [fichaHeaders];
ficha.getRange(`A6:G${fichaRows.length + 5}`).values = fichaRows;
applySheetStyle(ficha, "G", fichaRows.length + 5);
setColumnWidths(ficha, [16, 27, 43, 30, 16, 19, 49]);
ficha.getRange(`F6:F${fichaRows.length + 5}`).format.font = {
  name: "Arial",
  size: 10,
  bold: true,
  color: brandBlue,
};
ficha.getRange("A1:G45").format.wrapText = true;
ficha.getRange("A1:G45").format.verticalAlignment = "center";
ficha.getRange("A6:G45").format.rowHeight = 42;

const bookingHeaders = [
  "Área",
  "Campo o dato",
  "Qué representa",
  "Ejemplo",
  "Estado en Supabase",
  "Tabla / campo o recomendación",
];

const bookingRows = [
  ["Solicitud", "Restaurante", "Servicio al que se solicita la reserva.", "Restaurante Bahía", "Existe", "reservations.service_id → services.id"],
  ["Solicitud", "Cliente", "Usuario que solicita la mesa.", "UUID del usuario", "Existe", "reservations.customer_id"],
  ["Solicitud", "Fecha", "Día solicitado para comer.", "2026-11-20", "Existe", "reservations.reservation_date"],
  ["Solicitud", "Hora", "Hora solicitada.", "19:30", "Existe", "reservations.reservation_time"],
  ["Solicitud", "Cantidad de personas", "Número de comensales.", "4", "Existe", "reservations.guests; también adults y children."],
  ["Solicitud", "Tipo", "Clasifica la solicitud como reserva de mesa.", "table", "Existe", "reservations.kind acepta table."],
  ["Solicitud", "Estado", "Pendiente, aceptada, rechazada o cancelada.", "pending", "Existe", "reservations.status."],
  ["Solicitud", "Clave de idempotencia", "Evita crear dos reservas al repetir el envío.", "Clave única por envío", "Existe", "reservations.idempotency_key."],
  ["Contacto", "Nombre, teléfono y correo", "Datos de contacto asociados a la reserva.", "Nombre y teléfono del cliente", "Existe", "reservations.guest_name, guest_phone, guest_email."],
  ["Gestión", "Motivo de rechazo", "Explica por qué el local no puede aceptar.", "No hay mesas disponibles", "Existe", "reservations.decline_reason."],
  ["Gestión", "Fechas de aceptación o cancelación", "Registra cuándo cambió el estado.", "accepted_at", "Existe", "accepted_at, declined_at, cancelled_at."],
  ["Disponibilidad", "Horario por día", "Turnos reales disponibles para reservar.", "Viernes 12:00-15:00 y 18:00-22:00", "Insuficiente", "restaurant_profiles guarda solo un rango; crear tabla por día y turno."],
  ["Disponibilidad", "Mesas y capacidad", "Controla cantidad de mesas y asientos disponibles.", "Mesa de 2, 4 o 6 personas", "No aparece", "Definir si se asignará mesa o solo cupo por turno."],
  ["Disponibilidad", "Bloqueos", "Cierra fechas u horas por eventos o mantenimiento.", "20 de noviembre, cena privada", "No aparece", "Agregar bloqueos cuando el flujo de disponibilidad esté definido."],
  ["Políticas", "Tiempo máximo en mesa", "Duración esperada para liberar el cupo.", "90 minutos", "No aparece", "Campo de configuración del restaurante o del turno."],
  ["Políticas", "Tolerancia y no presentación", "Define espera y acciones ante llegada tardía.", "15 minutos", "No aparece", "Definir antes de automatizar penalizaciones."],
  ["Menú", "Sección", "Grupo del menú que pertenece al restaurante.", "Entradas", "Existe", "menu_sections.service_id, title y position."],
  ["Menú", "Plato", "Plato asociado a la sección del menú.", "Ceviche mixto", "Existe", "menu_dishes.section_id, name, description, price_cents, position."],
  ["Menú", "Precio", "Precio en centavos para evitar errores decimales.", "$12.00 = 1200", "Existe", "menu_dishes.price_cents; services.currency debe ser USD."],
  ["Menú", "Fotografía del plato", "Imagen opcional asociada al plato.", "Foto del ceviche", "No aparece", "Definir una relación de fotos para menu_dishes si se requiere."],
  ["Menú", "Alérgenos e ingredientes", "Información para decisiones alimentarias.", "Maní, lácteos, gluten", "No aparece", "Requiere campos o catálogo nuevo si se expondrá en web."],
];

reservations.getRange("A2:F2").merge();
reservations.getRange("A2").values = [["Reservas, disponibilidad y menú"]];
reservations.getRange("A3:F3").merge();
reservations.getRange("A3").values = [[
  "El esquema ya registra solicitudes de mesa y platos; la disponibilidad semanal aún necesita definición.",
]];
reservations.getRange("A5:F5").values = [bookingHeaders];
reservations.getRange(`A6:F${bookingRows.length + 5}`).values = bookingRows;
applySheetStyle(reservations, "F", bookingRows.length + 5);
setColumnWidths(reservations, [18, 28, 43, 34, 20, 50]);
reservations.getRange(`E6:E${bookingRows.length + 5}`).format.font = {
  name: "Arial",
  size: 10,
  bold: true,
  color: brandBlue,
};
reservations.getRange(`A6:F${bookingRows.length + 5}`).format.rowHeight = 40;

const galleryHeaders = [
  "Elemento",
  "Uso previsto",
  "Estado actual",
  "Estructura existente",
  "Pendiente para la galería",
];

const galleryRows = [
  ["Fotos del restaurante", "Mostrar portada y galería en el perfil del servicio.", "Preparada en el esquema; aún sin imágenes cargadas.", "service_photos(service_id, storage_path, is_cover, alt_text, position).", "Definir bucket, formatos, tamaño, carga, borrado y URLs públicas/firmadas."],
  ["Foto de portada", "Seleccionar la imagen principal del restaurante.", "Campo disponible.", "service_photos.is_cover.", "Acordar regla para que haya una sola portada por servicio."],
  ["Orden de imágenes", "Ordenar galería manualmente.", "Campo disponible.", "service_photos.position.", "El padmin debe permitir ordenar y guardar posiciones."],
  ["Texto alternativo", "Mejorar accesibilidad y describir la imagen.", "Campo disponible.", "service_photos.alt_text.", "Solicitar texto alternativo al cargar o permitir editarlo."],
  ["Fotos de platos", "Mostrar fotos específicas de los platos.", "No existe relación específica en el SQL compartido.", "menu_dishes no contiene photo_storage_path.", "Decidir si usar una tabla menu_dish_photos o un campo por plato."],
];

gallery.getRange("A2:E2").merge();
gallery.getRange("A2").values = [["Galería y estructura preparada"]];
gallery.getRange("A3:E3").merge();
gallery.getRange("A3").values = [[
  "Esta hoja deja documentada la preparación para imágenes sin asumir que ya existen fotos.",
]];
gallery.getRange("A5:E5").values = [galleryHeaders];
gallery.getRange(`A6:E${galleryRows.length + 5}`).values = galleryRows;
applySheetStyle(gallery, "E", galleryRows.length + 5);
setColumnWidths(gallery, [25, 43, 38, 56, 54]);
gallery.getRange(`A6:E${galleryRows.length + 5}`).format.rowHeight = 54;
gallery.getRange("A5:E10").format.borders = {
  preset: "inside",
  style: "thin",
  color: "#D9DDEA",
};
gallery.getRange("A5:E5").format.fill = accentRed;
gallery.getRange("A5:E5").format.font = {
  name: "Arial",
  size: 10,
  bold: true,
  color: "#FFFFFF",
};

ficha.getRange("F6:F45").format.fill = lightBlue;
reservations.getRange("E6:E26").format.fill = lightBlue;
ficha.getRange("F22:F34").format.fill = paleRed;
reservations.getRange("E17:E20").format.fill = paleRed;

await workbook.recalculate();

const out = await SpreadsheetFile.exportXlsx(workbook);
await fs.mkdir(outputDir, { recursive: true });
await out.save(`${outputDir}/Informacion_para_restaurantes.xlsx`);

const preview = await workbook.render({
  sheetName: "Ficha restaurante",
  range: "A1:G14",
  scale: 1,
  format: "png",
});
await fs.writeFile(
  `${outputDir}/restaurant-preview.png`,
  new Uint8Array(await preview.arrayBuffer()),
);

const summary = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 1500,
});
console.log(summary.ndjson);
