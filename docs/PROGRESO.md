# Bitácora de Panamá Viajero

Registro compartido entre las sesiones de Claude en local y en la nube. Cubre ambos repos
(`pv_admin` y `panama-viajero`). Lo más reciente va arriba.

> **Regla estricta de sincronización.** Antes de empezar: pull en ambos repos y leer esta
> bitácora. Al terminar: actualizarla, commit y push. Claude debe recordarlo siempre.

## Contrato de colaboración (plantilla nueva, 2026-11-06)

- Migración `202611060001_contract_fields.sql` aplicada en producción (prueba previa con
  ROLLBACK). Columna `contract_fields` (jsonb) en `business_contracts` para los datos del
  contrato sin columna propia (plazos, liquidación, planes, jurisdicción, etc.).
- Plantilla nueva en `src/lib/panel-contracts.ts` (`DEFAULT_CONTRACT_BODY`), 18 cláusulas,
  todos los datos como marcadores. `CONTRACT_FIELDS` define los campos del generador.
- Generador: sección «3 · Datos del contrato» con todos los campos; emitir exige que
  todos los datos de la plantilla tengan valor. Los borradores pueden guardarse a medias.
  Botón «Usar la plantilla nueva» para borradores existentes.
- Un solo constructor de valores (`contractValuesFor`) para generador, impresión y
  «Mi contrato». Contratos ya emitidos conservan su texto original.
- Pendiente: revisión legal por abogado panameño (referencias y tope de responsabilidad).
  Las preguntas abiertas de la plantilla se contestan en el generador por contrato.

## Hecho en esta sesión (2026-11-06)

- Plantilla de contrato nueva con datos editables, vista previa en azul, impresión limpia y logo.
- Documento de anuncio: el enlace abre el archivo al hacer clic.
- Promociones: día y rango en la reserva; próximas visibles; descuento por noche.
- Restaurantes y actividades: promo general del servicio en la fecha de la reserva.
- Precios siempre con dos decimales (`formatPrice`), web y vista previa del panel.
- Migración de owner_update_business aplicada; el panel ya solo edita el nombre.
- Vista previa del panel sincronizada con promociones próximas y precios.
- Solicitudes de negocios: formulario público, tabla `business_leads` y vista del equipo.
- Correo de solicitudes: función `notify-business-lead` desplegada y disparador al insertar. Falta
  guardar el secreto `RESEND_API_KEY` en Supabase (Project Settings → Edge Functions → Secrets).
  Hasta entonces la solicitud se guarda y el correo no sale.
- Sombra oscura del hero quitada.
- Negocios: botón «Nuevo negocio» en el panel del equipo; el propietario se asigna desde «Personas» en la ficha.
- Plan del negocio por categoría: «+ Agregar nuevo servicio» (pide el tipo en hospedaje y confirmación)
  sube el cupo del propietario; el propietario lo ve al recargar su panel.
  La ficha muestra solo categorías con su conteo. Se borró la línea repetida de Hospedaje ·
  Hoteles del negocio de prueba (quedó una).
- Plan como tope total: el propietario crea servicios mientras los creados sean menos que el
  cupo. «Agregar nuevo servicio» deja de verdad un cupo libre más: cupo = máx(cupo, creados) + N.
  Une líneas repetidas. La ficha del admin muestra los disponibles para crear.

## Pendientes (actualizado 2026-11-06)

Por decidir (lo contesta el dueño del proyecto):
1. Servicio de correo para las solicitudes de «Quiero publicar mi negocio» (Resend, plan gratuito:
   100 correos al día y 3,000 al mes). Falta crear la cuenta, la clave y el remitente.
   Destino: desarrollo.dkgroup@gmail.com.
2. Revisión del contrato por el jefe, incluido el tope de responsabilidad (cláusula 13.4).

Por verificar:
3. Pantallas nuevas del panel con cada rol, y el enlace «Ver documento actual» de anuncios.
   No hubo sesión para probarlas en el navegador.

## Documento de anuncio que no se veía (2026-11-05)

- El documento se subía y se guardaba (bucket `contracts`, ruta en `ad_requests`), pero el
  enlace «Ver documento actual» llevaba una URL firmada creada al cargar la página y no se
  abría al hacer clic.
- Corrección: el enlace apunta a `/panel/anuncios/[id]/documento`, que firma el archivo en
  el momento del clic (solo equipo). La página se refresca al subir el documento.

## Promociones en reservas de hospedaje (2026-11-05)

- Migración `202611050004_stay_promotion_pricing.sql` aplicada en producción (prueba previa
  con ROLLBACK). Cada noche usa la promoción vigente ese día: rango de fechas o días de la
  semana; una promoción sin habitación aplica a todas.
  - `stay_night_discount_pct` y `stay_room_total_cents` (funciones nuevas).
  - `quote_stay` devuelve el total ya con descuento (`totalPrice`) y `discountCents`.
  - `create_stay_reservation` guarda el total con descuento y agrega «promoción aplicada» en
    `price_detail`. La firma de 6 argumentos ahora delega en la de 11.
  - Prueba: Albrook Park Inn (habitación estándar, 9,99 % jueves y viernes). Miércoles a
    jueves: 11 900 + 10 711 = 22 611 centavos.
- Web (`panama-viajero`): la tarjeta de cada opción de hospedaje muestra el ahorro. Las
  promociones próximas aparecen en Promociones y en la ficha con «Próximamente», sin precio
  rebajado hasta que empiezan.
- Pendiente: restaurantes y actividades no aplican promoción aún (la reserva por fecha usa
  otra función). La vista previa del panel (`src/lib/public-service/`) es copia de la web y
  falta sincronizarla. El `discount_pct` 9.99 de la promoción de prueba sigue sin corregir.

## Rediseño del panel en Figma (2026-11-05)

- Aplicado al código (2026-11-05), parte 1:
  - Menú lateral oscuro agrupado por secciones (General, Catálogo, Gestión; en propietario,
    Mi negocio y Cuenta). «Servicios» entra al menú del equipo.
  - Barra superior con la ruta real (sección › página).
  - Contratos: vista previa al lado del formulario; fecha y formato de ganancia iguales en
    vista previa e impresión; hoja de impresión sin menú ni barra.
  - Promociones: el equipo ve «Promociones», no «Mis promociones».
- Contratos, parte 2 (2026-11-05): migración `202611050001_contract_legal_data.sql`
  aplicada en producción (columnas nuevas, nulas; prueba previa con ROLLBACK). Datos legales
  (razón social, RUC, representante, correo, dirección) y vigencia en el formulario, en la
  vista previa y en la impresión. Marcadores nuevos: razon_social, ruc, representante,
  direccion, vigencia_inicio, vigencia_fin.
- Rediseño completo aplicado al código (2026-11-05, parte 3):
  - Migración `202611050002_redesign_backend.sql` aplicada en producción (prueba previa con
    ROLLBACK). «Aprobar y publicar» publica de verdad, también para el colaborador. Contratos
    con estados submitted (por verificar) y void (anulado), versión, issued_at, verified_at y
    rejection_reason.
  - Contratos: asistente con datos legales, condiciones explicadas, simulador, plantilla con
    datos insertables y validación de marcadores. Emitir pide confirmación. Ficha del
    contrato emitido con verificación o rechazo de la firma, nueva versión y anulación. Las
    condiciones solo limitan promociones si el contrato está emitido, por verificar o vigente.
  - Pantallas: resúmenes por rol, revisión en bandeja, editor de servicio con pestañas,
    servicios, negocios, promociones, anuncios (ahora se pueden editar), destinos,
    sugerencias, notificaciones, Mi contrato (varios negocios) y Mi cuenta (nombre propio y
    cambio de contraseña).
  - Acciones nuevas: eliminar promoción, destino y línea del plan, editar anuncio, eliminar
    servicio propio, y nombre del negocio al crear un propietario. Todo lo destructivo usa un
    diálogo propio (`confirmAction` y `ConfirmSubmit` en `ui.tsx`), ya no `window.confirm`.
  - Notificaciones y métricas leen `service_promotions`, ya no la tabla vieja `promotions`.
    Avisos nuevos: copias por verificar, contratos por firmar o rechazados, sugerencias.
  - `tsconfig.json` excluye `supabase/functions`: el código de Deno rompía `next build`.
- Vista previa de la ficha (2026-11-05): usa los mismos componentes de la web
  (`src/components/public-service/`, copiados de panama-viajero). Lee borradores con la clave
  de servicio (`src/lib/public-service/service-detail.ts`) y muestra promociones, precios con
  descuento, habitaciones y la galería con flechas, arrastre y deslizamiento. Los enlaces no
  navegan. Si cambia la ficha pública, hay que copiar otra vez esos archivos.
- Anuncios por solicitud (2026-11-11): migración `202611110001_ad_requests.sql` aplicada en
  producción. El propietario pide un anuncio (imagen, promoción, fechas) en Mis anuncios. El
  equipo la toma, la gestiona fuera del panel, sube el PDF en Contratos y el administrador crea
  el anuncio desde la solicitud. El propietario recibe el resultado en Notificaciones.
- Alcance de promociones de hospedaje: todo el hospedaje o una habitación. En restaurantes y
  demás servicios la promoción aplica al servicio completo.
- Anuncios en la web: el botón «Descubrir» lleva a la habitación o al servicio de la promoción.
- Plantilla de contrato: versión profesional, pendiente de revisión por abogado.
- Scripts: `scripts/crear-admin.mjs` (crea administradores desde la terminal).
- Pendiente: revisar el panel en el navegador con cada rol (no se pudo sin sesión).

- Archivo `ofwwJbkLCJ7DWhDLe2Y2On` (Panamá Viajero), página «REDISEÑO-PANEL». El diseño viejo
  sigue en la página «Panel administrativo».
- Hay 3 vistas, no 4: owner y admin ven lo mismo (solo cambia Permisos). Pantallas:
  owner/admin A01–A32, colaborador C01–C06 y propietario P01–P12. Hay además un sistema de
  diseño (variables «PV Rediseño», estilos `PV/*`, componentes `pv/*`) y un marco
  «Índice y notas».
- Generador de contratos (A20–A25, P07, P08, P12):
  - Asistente de 4 pasos con vista previa en vivo.
  - Datos legales nuevos y vigencia.
  - Simulador de comisión.
  - Cláusulas con datos insertables.
  - Emitir con confirmación.
  - Verificación de la firma, con opción de rechazar o crear una versión nueva.
  - Hoja de impresión limpia.
- Pendiente: el usuario aprueba el diseño y después se programa. El generador necesita una
  migración: campos legales, fechas, estado «por verificar» y versiones. También necesita CSS
  de impresión y aplicar los límites solo con el contrato emitido. Los demás problemas
  detectados están en el marco «Índice y notas».

## Estado actual (2026-10-28)

- **Agregar servicios al plan después de crear cuenta** (2026-10-28):
  - Nuevo componente `panel-service-plan-form.tsx` con formulario para añadir servicios.
  - Selección de categoría, tipo de hospedaje (condicional) y cantidad con stepper.
  - Acción servidor `addServicePlanAction` valida datos y maneja duplicados.
  - Página de detalle del negocio ahora obtiene todas las categorías y tipos al cargar.
  - Formulario solo visible para administradores y colaboradores del negocio.
  - Se puede añadir servicios al plan en cualquier momento después de crear la cuenta.

- **Crear negocios al crear propietario** (2026-10-28):
  - Administrador o colaborador ahora puede crear negocios (services) con datos iniciales
    (nombre y precio) en el mismo formulario de creación de propietario.
  - Campos opcionales: si se dejan vacíos, el propietario completa los datos después.
  - Slug generado automáticamente con nombre + business_id.
  - Servicios se crean directamente en tabla `services` como borrador.
  - Cambios en `panel-owner-form.tsx` y `src/app/panel/propietarios/actions.ts`.

- **Limpieza de actividades de demostración** (2026-10-28):
  - Eliminadas todas las actividades de la categoría "actividades" (40+ actividades de demostración).
  - Borrados registros: activity_hours, activity_profiles, services (categoría actividades).
  - Usuario creará "Crazy Park" desde cero en el panel con su propio contenido.
- **Actividades con datos operacionales completos** (2026-10-28):
  - Migración `202610280003` aplicada en Supabase producción.
  - Panama-viajero redeployado en Cloudflare (v40a2de56-e213-49a6-8a9e-419fae2b32d0).
  - Ficha pública lista para mostrar: estado actual, horarios semanales, edad, qué incluye,
    atracciones con opciones, ubicación exacta, mapa y reseñas.
- **Corregida serialización de datos de actividades** (2026-10-27):
  - Problema: Error "permission denied for table activity_profiles" al guardar actividades
  - Causa: Formulario enviaba `detail__*` campos separados en lugar de `activity_details` JSON
  - Solución: Actualizado `service-editor-form.tsx` para serializar atracciones, horarios e
    inclusions como un único objeto JSON en campo `activity_details`
  - Resultado: Acción servidor ahora recibe los datos en el formato esperado
- **Mejoras en formulario de actividades** (2026-10-27):
  - Horarios: ahora incluyen hora de inicio Y cierre (no solo inicio)
  - "Lo que incluye": cambió de textarea a lista editable con botón "Agregar incluido"
  - Atracciones: soporte completo para hasta 5 fotos por atracción (galería drag&drop)
  - Tipos actualizados en ambos repos para reflejar la nueva estructura
  - Panel: formulario completamente funcional con todos los campos
  - Sitio público: muestra horarios completos y galerías de fotos en atracciones
- **Actividades completamente implementadas con editor de atracciones** (2026-10-27):
  - Panel (pv_admin): formulario con horarios semanales, edad recomendada, qué incluye,
    atracciones y ubicación exacta; soporte para múltiples turnos por día (checkbox).
  - Editor de atracciones: `src/components/activity-form-fields.tsx` con componentes para
    editar atracciones (nombre, descripción, galería de 5 fotos cada una).
    `src/components/service-editor-form.tsx` integra AttractionsField cuando
    categoryId === 'actividades'.
  - Atracciones se almacenan en `lodging.details.attractions` (JSONB).
  - Migraciones aplicadas: `activity_hours` para horarios, columnas en `activity_profiles`
    para ubicación y control de turnos múltiples.
  - Servidor: carga de horarios, estado en tiempo real (Abierto/Pronto a cerrar/Cerrado),
    ubicación exacta, botón de reserva como en hoteles y restaurantes.
  - Ficha pública (panama-viajero): muestra estado actual, horarios semanales, ubicación
    completa (Mapa + Destino + Sitio turístico + Ubicación exacta), botón de reserva,
    y atracciones con galería (recuperadas de activity_profiles.details.attractions).
  - Datos de demostración: 20 actividades PUBLICADAS con horarios y sitios turísticos
    (scripts SQL: `seed-demo-actividades-panama.sql`).
  - **Verificado**: Aparecen en la base de datos con estado publicado.
  - TypeScript y eslint limpios. Listo para probar en navegador.
- Botón "Ver menú" en restaurantes ahora abre el enlace externo (`menu_url`) en una
  nueva pestaña.

## Estado anterior (2026-10-22)

- Local y nube sincronizados: el usuario subió sus últimos cambios a `main` en ambos repos.
- Rama de trabajo única: `fusion` (local y nube). En `panama-viajero` se creó desde `main`.
- `feat/merchant-dashboard` integrada en `fusion` y `main`. Sus migraciones ya estaban
  aplicadas en producción.

## Panel de propietarios (ya funciona)

- Crea servicios dentro de su plan (`business_service_plans`: categoría, tipo, cantidad).
  `padmin_can_create_service` valida el límite por tipo. No hay límite total de hospedajes.
- "Mis servicios" muestra el estado combinado (`ownerStateOf`): Borrador, Pendiente de
  revisión, Devuelto con correcciones, Aprobado (listo para publicar), Publicado.
- El equipo aprueba sin publicar; el propietario publica con `publishOwnServiceAction`.
  La migración `202610210001` permite ese cambio en `padmin_protect_service_review`.
- Editor: `OwnServiceStatusPanel` con "Eliminar revisión" (vuelve a borrador) y "Eliminar
  servicio", con confirmación (`withdrawReviewAction`, `deleteOwnServiceAction`).
- `saveServiceAction` devuelve `{ error, saved }`. Servicio nuevo: redirige a su edición.
  El formulario usa `handleSubmit` + `startTransition`; el error sale en la barra inferior.

## Formulario de hospedaje

- Operación: recepción (No / 24 horas / horario), check-in, check-out, idiomas,
  estacionamiento, plan de comidas obligatorio (`meal_plans` → `services.meal_plan_id`),
  mascotas, fumar, eventos con reglamento si es Sí, cancelación.
- Habitaciones (`room_types`) para todo tipo de hospedaje, en la página del servicio, cada una
  con su galería (10). Galería general aparte (15 hospedaje, 30 restaurante, 10 otros).
  Ya no existen los tipos de apartamento; solo quedan las reglas de la casa.
- Hospedaje sin precio (`base_price_cents` nulo). Las demás categorías exigen precio.

## Estado de la base de producción (revisado con el conector, 2026-10-22)

- El historial de Supabase solo registra las migraciones móviles (`20260930*`). Las del repo
  se aplicaron a mano; su estado se comprueba por los objetos que crean.
- Aplicadas: `202610200002` (sin `area_label` ni coordenadas, con `maps_embed_url`),
  `202610200005` (ya no existe `cities` ni `services.city_id`), `202610200006`,
  `202610200007` (`business_members.added_by`), `202610200008`
  (`owner_create_draft_service`), `202610210001`, `202610210002` y `202610220001`.
- `quote_stay` no usa `cities` (el aviso anterior era un falso positivo).
- `owner_create_draft_service` tiene los acentos dañados en producción ("estÃ¡"):
  se aplicó con una codificación incorrecta. Volver a aplicarla en UTF-8.
- `set_service_tourist_sites` devolvió 404 en tres llamadas (21 y 22 de octubre). La función
  y sus permisos están bien; revisar si se repite.
- Avisos de seguridad de Supabase: 11 funciones sin `search_path` fijo, funciones
  `SECURITY DEFINER` ejecutables por `anon` (incluye pagos y reservas) y protección de
  contraseñas filtradas desactivada.

## Cambios manuales en producción que faltan en el repo

- `enforce_service_tourist_site_province` reescrita: compara `tourist_sites.province_id`
  con `services.destination_province_id` (ya no usa `cities`).
- Restricciones en `services` sin migración en el repo: `services_price_matches_category`,
  `services_currency_check` (USD), `services_name_not_blank`. Las de rating, estado y
  revisión pueden venir de las migraciones móviles.
- Tabla `meal_plans` (id, label, sort_order) y `services.meal_plan_id` (text, nullable).
- Planes de prueba: `b2996846` → hoteles 1, apartamentos 1, restaurantes 1;
  `ba40eb93` → resorts 1, restaurantes 1.

## Pendientes

1. Corregir los acentos de `owner_create_draft_service` en producción.
2. Revisar los avisos de seguridad de Supabase (ver arriba).
3. Pasar a migraciones del repo los cambios manuales listados arriba.
4. Probar en navegador: guardar restaurante con confirmación, eliminar, retirar revisión,
   publicar aprobado.
5. Revisar `quote_stay` (usa `cities`).
5. Decidir si se agrega un límite total de hospedajes además del límite por tipo.
6. Sin uso tras volver al flujo del usuario (son de `feat/merchant-dashboard`; decidir si
   se borran): `merchant-service-form.tsx`, `prepare-draft-service-button.tsx`,
   `servicios/[id]/portada`, `saveMerchantServiceAction` y `src/lib/panel-service-plans.ts`.
   `vista-previa` sigue enlazada desde la edición del servicio.
7. "Agregar otra persona" en Mi cuenta usa `SUPABASE_SERVICE_ROLE_KEY`. Mi cuenta fallaba
   porque el worker no la encuentra: revisar el secreto en Cloudflare (y rotar la clave).
8. Rotar la clave `service_role` de Supabase y actualizar el secreto en Cloudflare.
9. Ajustar textos del panel de revisión y notificaciones a los nuevos estados.
10. Decisión del usuario: el propietario usa su flujo (lista "Mis servicios", "Mi panel",
    crear desde `/panel/servicios/nuevo` y `ServiceEditorForm`), no el de
    `feat/merchant-dashboard`. No combinar ambos.
    `202610200005_owner_draft_service_quota.sql` es copia idéntica de `202610200008`.

## App móvil (`Panama-Viajero-mobile`)

- Repo privado de `neithandvss`; se trabaja solo en local y sin push sin permiso del usuario.
- Análisis completo en `docs/ANALISIS-MOVIL.md`. Hoy no carga el catálogo en producción: pide
  `cities`, `city_id`, `area_label`, coordenadas y `maps_query`, que ya no existen. Busca las
  fotos de servicios en `catalog-photos` en vez de `service-media`.
- Sus scripts `supabase/seed-remote-catalog.mjs`, `complete-catalog-photos.mjs` y
  `tests/remote` escriben en producción. No ejecutarlos.
- Cambios propuestos en el móvil: pendientes de confirmación del usuario.

## Rediseño del sitio con el diseño de la app (en `main`)

- Decisión del usuario (2026-10-24): la app móvil es el diseño principal; el sitio copia todo
  lo de la app, celular primero (igual a la app), luego tableta y escritorio parecidos.
- Aprobado por el usuario (2026-10-24): el rediseño pasó de `fusion` a `main` en `panama-viajero`.
- Hecho: marco con pestañas (celular) y barra superior (escritorio), portada, Buscar,
  categorías con filtros y orden, ficha de servicio y restaurante, habitación, carta,
  destinos, sitio turístico, promociones, Cuenta, inicio de sesión, registro y contraseñas.
- Hecho también (2026-10-24): Favoritos unidos a la cuenta (`merge_favorites` y tabla
  `favorites`), solicitud de reserva (/servicios/[slug]/solicitar), reserva de hospedaje con
  cotización real (`quote_stay`) y pago simulado como en la app, Mis viajes con detalle y PIN
  de llegada, panel del hotel (/negocio/reservas: aceptar, rechazar, validar PIN, no show),
  eliminar cuenta. Se borró el diseño anterior (componentes viejos, `legacy.css`, /api).
  `/perfil` redirige a `/cuenta`.
- Probado contra producción: todas las páginas cargan; la cotización de hospedaje responde.
  No se creó ninguna reserva real. Falta probar con sesión iniciada (reservar, cancelar,
  panel del hotel) y revisar a mano tableta y escritorio pantalla por pantalla.
- Sin copiar todavía: la bienvenida con carrusel de promociones del primer arranque de la app.
- Para los enlaces de correo hace falta añadir `<dominio>/cuenta/confirmar` a las URL de
  redirección de Supabase Auth (cambio en `auth`: pedir confirmación al usuario).

## Historial

- 2026-10-27 (nube): **Actividades: nueva estructura con atracciones y opciones** → PASADO A MAIN:
  - Panel (pv_admin): Componentes nuevos `OptionsField` y `ActivityScheduleField`; editor
    integrado en formulario de servicios con paneles "Horarios" y "Descripción y Atracciones".
  - Tipos actualizados: `ActivityAttraction` incluye `options[]`; `ActivitySchedule` ahora es
    `Record<string, string>` (solo hora inicio, sin duración).
  - Web pública (panama-viajero): tipos sincronizados; pantalla de actividades muestra solo
    "Inicia a las HH:MM"; display completo: descripción, lo que incluye, atracciones con
    opciones, horarios por día, edad recomendada.
  - Migración `202610280002_example_activities_new_structure.sql`: inserta 2 ejemplos
    (Senderismo Cerro Jefe + Tour Gastronómico Panamá City) con todas las secciones pobladas.
  - Commit/Push a rama `claude/dazzling-rubin-ryrvx6`; fusionado a `main` en ambos repos.

- 2026-10-27 (nube): Datos: 20 nuevas actividades distribuidas entre los 12 sitios turísticos
  de Panamá provincia. Scripts SQL: `borrar-demo-actividades-panama.sql` y
  `seed-demo-actividades-panama.sql`. Actividades con horarios realistas, ubicación exacta,
  precios $30-$70, edades mínimas 5-16+.

- 2026-10-27 (nube): Actividades: carga de horarios semanales, estado en tiempo real,
  ubicación exacta y botón de reserva en la ficha pública (panama-viajero/src/lib/service-detail.ts
  y activity-screen.tsx). Soporte para múltiples turnos por día en el panel (pv_admin).

- 2026-10-26 (nube): `supabase/seed-demo-restaurantes-panama.sql` crea 35 restaurantes
  ficticios (10 vinculados a hoteles demo); `borrar-demo-restaurantes-panama.sql` los quita.

- 2026-10-26 (nube): `supabase/seed-demo-hoteles-panama.sql` crea 25 hospedajes ficticios
  publicados en Panamá (slug `demo-pa-`); `borrar-demo-hoteles-panama.sql` los elimina.

- 2026-10-26 (local): Panel de propietarios: botón para eliminar sitios turísticos en la edición.

- 2026-10-24 (local): `panama-viajero` pasa a OpenNext con `wrangler.jsonc` (variables públicas
  de Supabase en `vars`). Cloudflare compilación con `npx opennextjs-cloudflare build` y
  `npx wrangler deploy`. Corregido: el degradado del título (.titleScrim) cubre el ancho
  completo en escritorio (left/right calc para escapescape del content-max).

- 2026-10-24 (local): rediseño del sitio con el diseño de la app, primera parte (ver arriba).

- 2026-10-24 (local): análisis de la app móvil contra producción (`docs/ANALISIS-MOVIL.md`).
  Las fotos de 78 sitios y de las promociones son rutas de `catalog-photos`; el sitio y el
  panel ya las muestran. El panel deja de rechazar al guardar un sitio con esa foto antigua.
  No probado en navegador. El conector de Supabase no estaba disponible.

- 2026-10-23 (nube): sitio público conectado a `destinations` (portada, /destinos y cada
  destino con banner, sitios turísticos, hospedajes, restaurantes y mapa). Probado contra
  producción.

- 2026-10-23 (nube): un hospedaje vincula restaurantes ya creados del mismo negocio
  (`lodging_profiles.details.linked_restaurant_ids`); el sitio los muestra si están
  publicados. Vista previa de fotos al elegirlas en habitaciones y áreas.

- 2026-10-23 (nube): formularios en cuadrícula (campos cortos en columnas; textos largos,
  casillas y botones a lo ancho). Casillas en columnas. Probado en escritorio y móvil.

- 2026-10-23 (nube): las habitaciones se listan primero; el alta se abre con
  "+ Agregar habitación", muestra el error junto al botón y no borra lo escrito.

- 2026-10-23 (nube): formulario completo de habitación para todos los roles (camas,
  dormitorios, baños, área, precio, cantidad, comodidades en `details.amenities` y fotos).
  Se quitan del formulario general los textos que repetían habitaciones o unidades.
  Pendiente: error al cargar `/panel/servicios` (esperando el mensaje de Cloudflare).

- 2026-10-23 (nube): habitaciones y áreas dentro de la página del servicio, cada una con su
  galería (también al crearlas). `/unidades` redirige ahí. Galería solo general. Se quitan
  los tipos de apartamento. El sitio público muestra la foto de cada habitación.

- 2026-10-22 (nube): `panama-viajero` conectado al panel: sin `cities`/`area_label`, fotos
  de `service-media`, ficha con horarios, normas, contacto, plan de comidas y mapa;
  filtros por provincia y tipo de hospedaje. Probado contra producción con la clave pública.

- 2026-10-22 (nube): "Borrar cuenta" muestra el motivo si falla (hoy: falta la clave de
  servicio en el worker). Regla de la base: solo se pregunta por cambios en `auth`.

- 2026-10-22 (nube): Propietarios lee con la sesión del equipo (profiles con correo), sin la
  clave de servicio. Crear, suspender y borrar cuentas sí la siguen necesitando.

- 2026-10-22 (nube): el colaborador revisa servicios (vista previa, aprobar, pedir cambios)
  y deja de tener Permisos. `202610220001_collaborator_reviews.sql` aplicada y probada.
  Propietarios y Mi cuenta fallan por falta de `SUPABASE_SERVICE_ROLE_KEY` en el worker.

- 2026-10-22 (nube): el panel de estado muestra las correcciones del equipo; "Eliminar
  servicio" pasa a la barra inferior, a la derecha. Pendiente de pasar a `main`.

- 2026-10-22 (nube): flujo del propietario restaurado al del usuario. "Cancelar revisión"
  en vez de "Eliminar revisión", sin "Eliminar" en la lista, Mi cuenta lee nombres sin la
  clave de servicio y se corrige el número de la campana. Pendiente de pasar a `main`.
- 2026-10-22 (nube): revisión de la base con el conector de Supabase (solo lectura).
  `fusion` pasa a `main` con `feat/merchant-dashboard` y el editor del propietario.
- 2026-10-22 (nube): se integra `feat/merchant-dashboard` en `fusion` (no en `main`).
- 2026-10-22 (nube): `fusion` pasa a `main`; se borra la rama `claude/adoring-lamport-hgz2jf`.
- 2026-10-22 (nube): la rama de trabajo pasa a ser `fusion` en ambos repos.
- 2026-10-22 (nube): se crean `CLAUDE.md` en ambos repos y esta bitácora.
