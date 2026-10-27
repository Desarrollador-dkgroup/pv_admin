# Bitácora de Panamá Viajero

Registro compartido entre las sesiones de Claude en local y en la nube. Cubre ambos repos
(`pv_admin` y `panama-viajero`). Lo más reciente va arriba.

> **Regla estricta de sincronización.** Antes de empezar: pull en ambos repos y leer esta
> bitácora. Al terminar: actualizarla, commit y push. Claude debe recordarlo siempre.

## Estado actual (2026-10-27)

- **Editor de atracciones para actividades implementado** (2026-10-27, nube):
  - Nuevo archivo: `src/components/activity-form-fields.tsx` con componentes
    para editar atracciones (nombre, descripción, galería de 5 fotos).
  - Actualizado: `src/components/service-editor-form.tsx` integra
    `AttractionsField` cuando categoryId === 'actividades'.
  - Las atracciones se almacenan en `lodging.details.attractions` (JSONB).
  - Soporte para galería de imágenes con vista previa en cliente (FileReader API).
  - El formulario serializa las atracciones a JSON y las envía como hidden input
    `detail__attractions` al guardar.
  - TypeScript y eslint limpios. Listo para probar en navegador.
  - Pendiente: verificar que el servidor guarda y recupera las atracciones
    correctamente, probar edición y visualización de atracción en detalle de
    actividad en sitio público.

## Estado actual (2026-10-27 - anterior)

- **Datos de demostración: 20 nuevas actividades PUBLICADAS en producción** (2026-10-27):
  - Scripts SQL: `seed-demo-actividades-panama.sql` (crea 20 actividades, status=draft).
  - Función SQL: `approve_and_publish_demo_activities()` (aprueba y publica en una sola ejecución).
  - 20 actividades: distribuidas en Panamá provincia, precios $30–$70 USD,
    edades mínimas 5–16+, ubicaciones exactas, horarios 09:00–17:00 lunes–domingo.
  - Vinculadas al negocio de prueba (`b2996846-c6ec-43dc-ae69-192fcbf85d75`).
  - **Estado**: status='published', review_status='approved'.
  - Detalles JSONB: min_age, what_includes (vacío), attractions (vacío).
  - Horarios: 7 registros por actividad (días lunes–domingo, CROSS JOIN).
  - **Verificado**: Aparecen en la base de datos con estado publicado.
  - **Próximo paso**: Verificar que aparecen en sitio público (panama-viajero).
- Local y nube sincronizados: rama de trabajo `claude/adoring-lamport-hgz2jf` con los scripts.

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
- Apartamento: tipos guardados en `lodging_profiles.details.apartment_types`; reglas de la casa.
- Hospedaje sin precio (`base_price_cents` nulo). Las demás categorías exigen precio.

## Cambios manuales en producción que faltan en el repo

- `enforce_service_tourist_site_province` reescrita: compara `tourist_sites.province_id`
  con `services.destination_province_id` (ya no usa `cities`).
- Restricciones en `services`: `services_hospedaje_fields_match_category`,
  `services_price_matches_category`, `services_currency_check` (USD),
  `services_maps_embed_url_check`, `services_name_not_blank`, `services_rating_*`,
  `services_review_status_check`, `services_status_check`.
- Tabla `meal_plans` (id, label, sort_order) y `services.meal_plan_id` (text, nullable).
- `202610200002` falló por `city_id`: aplicar solo sus partes útiles (`maps_embed_url`).
- Planes de prueba: `b2996846` → hoteles 1, apartamentos 1, restaurantes 1;
  `ba40eb93` → resorts 1, restaurantes 1.

## Pendientes

1. ~~**Sitio público usa `cities`**~~ **RESUELTO** (2026-10-27):
   - `202610200005` aplicada: tabla `cities` eliminada.
   - Actualizado sitio público en panama-viajero para usar `destination_province_id`.
   - Archivos corregidos: `api/services`, `service-details`, `tourist-sites`,
     `tourist-site-services`, `sitios-turisticos/[slug]/page`, `use-published-services`.
2. Revisar `quote_stay` (usa `cities`).
3. Confirmar que `202610200006`, `202610200007` y `202610210001` están aplicadas.
4. Pasar a migraciones del repo los cambios manuales listados arriba.
5. Probar en navegador: guardar restaurante con confirmación, eliminar, retirar revisión,
   publicar aprobado.
6. Decidir si se agrega un límite total de hospedajes además del límite por tipo.
7. Decidir si los tipos de apartamento se quedan o se usa la pantalla de unidades
   (`/panel/servicios/[id]/unidades`).
8. Borrar archivos sin uso: `src/components/panel-delete-owner-form.tsx` y
   `src/components/panel-delete-service-button.tsx`.
9. Rotar la clave `service_role` de Supabase y actualizar el secreto en Cloudflare.
10. Ajustar textos del panel de revisión y notificaciones a los nuevos estados.
11. Decidir qué hacer con `feat/merchant-dashboard`.

## Historial

- 2026-10-22 (nube): se crean `CLAUDE.md` en ambos repos y esta bitácora.
