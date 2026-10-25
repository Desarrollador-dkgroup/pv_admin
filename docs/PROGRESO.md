# Bitácora de Panamá Viajero

Registro compartido entre las sesiones de Claude en local y en la nube. Cubre ambos repos
(`pv_admin` y `panama-viajero`). Lo más reciente va arriba.

> **Regla estricta de sincronización.** Antes de empezar: pull en ambos repos y leer esta
> bitácora. Al terminar: actualizarla, commit y push. Claude debe recordarlo siempre.

## Estado actual (2026-10-22)

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

- 2026-10-24 (local): `panama-viajero` pasa a OpenNext con `wrangler.jsonc` (variables públicas
  de Supabase en `vars`). En `fusion`; falta ajustar en Cloudflare la compilación y
  las variables de compilación antes de pasarlo a `main`.

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
