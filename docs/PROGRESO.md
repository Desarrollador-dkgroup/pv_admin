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
- Apartamento: tipos guardados en `lodging_profiles.details.apartment_types`; reglas de la casa.
- Hospedaje sin precio (`base_price_cents` nulo). Las demás categorías exigen precio.

## Estado de la base de producción (revisado con el conector, 2026-10-22)

- El historial de Supabase solo registra las migraciones móviles (`20260930*`). Las del repo
  se aplicaron a mano; su estado se comprueba por los objetos que crean.
- Aplicadas: `202610200002` (sin `area_label` ni coordenadas, con `maps_embed_url`),
  `202610200005` (ya no existe `cities` ni `services.city_id`), `202610200006`,
  `202610200007` (`business_members.added_by`), `202610200008`
  (`owner_create_draft_service`), `202610210001` y `202610210002`.
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

1. **Sitio público usa `cities` y `area_label`, que ya no existen en producción**
   (el usuario pidió verlo después: recordárselo). Fallan el catálogo, el detalle de
   servicio y los sitios turísticos (`api/services/route.ts`, `service-details.ts`,
   `tourist-sites.ts`, `tourist-site-services.ts`, `sitios-turisticos/[slug]/page.tsx`).
2. Corregir los acentos de `owner_create_draft_service` en producción.
3. Revisar los avisos de seguridad de Supabase (ver arriba).
4. Pasar a migraciones del repo los cambios manuales listados arriba.
5. Probar en navegador: guardar restaurante con confirmación, eliminar, retirar revisión,
   publicar aprobado.
6. Decidir si se agrega un límite total de hospedajes además del límite por tipo.
7. Decidir si los tipos de apartamento se quedan o se usa la pantalla de unidades
   (`/panel/servicios/[id]/unidades`).
8. Sin uso tras volver al flujo del usuario (son de `feat/merchant-dashboard`; decidir si
   se borran): `merchant-service-form.tsx`, `prepare-draft-service-button.tsx`,
   `servicios/[id]/portada`, `saveMerchantServiceAction` y `src/lib/panel-service-plans.ts`.
   `vista-previa` sigue enlazada desde la edición del servicio.
13. Aplicar en producción `202610220001_collaborator_reviews.sql` (pendiente de confirmar).
12. "Agregar otra persona" en Mi cuenta usa `SUPABASE_SERVICE_ROLE_KEY`. Mi cuenta fallaba
    porque el worker no la encuentra: revisar el secreto en Cloudflare (ver pendiente 9).
9. Rotar la clave `service_role` de Supabase y actualizar el secreto en Cloudflare.
10. Ajustar textos del panel de revisión y notificaciones a los nuevos estados.
11. Decisión del usuario: el propietario usa su flujo (lista "Mis servicios", "Mi panel",
    crear desde `/panel/servicios/nuevo` y `ServiceEditorForm`), no el de
    `feat/merchant-dashboard`. No combinar ambos.
    `202610200005_owner_draft_service_quota.sql` es copia idéntica de `202610200008`.

## Historial

- 2026-10-22 (nube): el colaborador revisa servicios (vista previa, aprobar, pedir cambios)
  y deja de tener Permisos. Requiere aplicar `202610220001_collaborator_reviews.sql`.
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
