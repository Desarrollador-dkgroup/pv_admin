# Análisis de la app móvil frente a la base actual (2026-10-24)

Repo analizado: `neithandvss/Panama-Viajero-mobile` (`main`, commit `b4ebec3`), Expo 57.
Comprobado contra producción (`qqhcsacdffdxcbkzgulk`) con consultas de solo lectura: las de
la app con la clave pública y el esquema con la clave de servicio. El conector de Supabase no
estaba disponible en esta sesión.

## 1. Resultado principal: la app no carga el catálogo

Las tres consultas que arman el catálogo fallan hoy en producción, así que la app se queda en
el estado de error en todas las pantallas:

| Consulta (`src/data/catalog-queries.ts`) | Error en producción |
|---|---|
| `fetchServicesFull` | no existe la relación `services` → `cities` |
| `fetchTouristSites` | no existe la relación `tourist_sites` → `cities` |
| `fetchPromotions` | no existe la relación `promotions` → `cities` |

Además, "Mis viajes" y las reservas del negocio (`booking-queries.ts`) piden
`services(..., cities(name))` y también fallan. Su respaldo solo atrapa el error 42703 (columna
inexistente), no el PGRST200 (relación inexistente).

Campos que usa la app y ya no existen:

- `cities`, `services.city_id`, `tourist_sites.city_id`, `promotions.destination_city_id`.
- `services.area_label`, `latitude`, `longitude`, `latitude_delta`, `longitude_delta`.
- `services.maps_query` (ahora es `maps_embed_url`, solo URL de inserción de Google Maps).
- `destination_kind = 'city'` en promociones (ahora solo `service`, `province`, `category`).

Sí coinciden: `categories`, `tourist_sites` (sin ciudad), `service_photos`, `service_amenities`,
`service_schedules`, `room_types`, `room_type_photos`, `room_type_amenities`,
`restaurant_profiles`, `menu_sections`, `menu_dishes`, `restaurant_service_features`,
`reviews`, `profiles`, `favorites`, `business_members` y `reservations`, incluidas sus columnas
nuevas (`guest_*`, `adults`, `children`, `visit_status`, `hold_expires_at`, `is_test`).
Todas las funciones que llama la app existen con los mismos parámetros: `quote_stay`,
`create_stay_reservation`, `create_request_reservation`, `cancel_reservation`,
`accept_reservation`, `decline_reservation`, `mark_reservation_no_show`,
`create_payment_attempt`, `get_or_issue_checkin_pin`, `validate_checkin_pin`,
`merge_favorites`, `public_profile_for`, `prepare_account_deletion` y
`verify_payment_attempt_from_webhook`.

## 2. Fotos: buckets distintos

| Contenido | Dónde está hoy | Qué hace la app |
|---|---|---|
| Servicios y habitaciones | `service-media` (ruta) | busca en `catalog-photos` → no se ven |
| Destinos | `destination-media` (ruta) | no lee `destinations` |
| Sitios turísticos | 78 en `catalog-photos` (ruta), 2 subidos desde el panel en `site-media` (URL completa) | antepone `catalog-photos` también a la URL completa → esas 2 fallan |
| Promociones | `catalog-photos` (ruta) | correcto |

El sitio público y el panel solo aceptaban URL completas para sitios y promociones: 78 de 80
sitios y las 5 promociones salían con la imagen genérica. Se corrige en esta sesión (ver 5).

## 3. Datos que guarda el panel y la app todavía no muestra

- **Destinos** (`destinations`): nombre, subtítulo, descripción, tarjeta, banner y mapa. La app
  sigue usando una lista fija de ciudades (`CITY_PROVINCE`) para "Ciudades populares".
- **Ubicación del servicio**: `destination_province_id`, `address`, `maps_embed_url` y los
  sitios secundarios (`service_tourist_sites`). La app solo conoce `tourist_site_id`.
- **Hospedaje** (`lodging_profiles`): contacto, web, check-in y check-out, recepción, idiomas,
  llegada, normas, mascotas, fumar, eventos, cancelación, registro turístico y
  `details.linked_restaurant_ids` (restaurantes del mismo negocio).
- **Plan de comidas y tipo de hospedaje** como texto (`meal_plans.label`,
  `hospedaje_types.label`). La app solo usa los identificadores con etiquetas fijas.
- **Habitaciones**: `bedroom_count`, `bathroom_count`, `area_m2`, `booking_unit` y
  `details` (vista, piso, accesibilidad, balcón, sala y comedor, tipo). El panel guarda las
  comodidades como texto en `details.amenities`; `room_type_amenities` está vacía, así que la
  app no muestra ninguna comodidad.
- **Restaurantes**: horario por día (`restaurant_hours`), cocina, estilo, ambiente, contacto,
  web, enlace al menú (`menu_url`), precio promedio y reglas de reserva.
- **Promociones**: descripción, condiciones, incluye y no incluye, horario, precio regular y
  promocional, porcentaje de descuento.
- **Foto de portada de habitación** (`room_type_photos.is_cover`) y fotos de áreas
  (`service_photos.lodging_area_id`).

## 4. Riesgos

- **Claves**: no hay claves secretas en el código ni en el historial de los tres repos. La clave
  pública (`sb_publishable_…`) aparece en el historial de `pv_admin` y `panama-viajero`; es
  pública por diseño y no hace falta rotarla. La clave `service_role` sí debe rotarse por la
  captura (pendiente conocido).
- **Scripts del móvil que escriben en producción**: `supabase/seed-remote-catalog.mjs`,
  `supabase/complete-catalog-photos.mjs` y `supabase/tests/remote` apuntan a
  `qqhcsacdffdxcbkzgulk` como si fuera un proyecto de desarrollo. Ejecutarlos mete datos de
  demostración en producción.
- **`supabase/config.toml` del móvil**: `supabase config push` cambiaría la configuración de
  autenticación de producción.
- **Migraciones duplicadas**: el móvil tiene sus propias migraciones `20260930*` (con
  `cities`). La fuente es `pv_admin`; si alguien aplica las del móvil, se desordena la base.
- **Funciones `SECURITY DEFINER` ejecutables por `anon`** y otros avisos de Supabase (ya en la
  bitácora).

## 5. Cambios propuestos

### pv_admin (se aplican en esta sesión)

- Mostrar en el panel las fotos de sitios guardadas como ruta de `catalog-photos` (antes salía
  el marcador vacío en 78 sitios).
- Este informe y la bitácora.

### panama-viajero (se aplican en esta sesión)

- Resolver las fotos de sitios turísticos y promociones guardadas como ruta en
  `catalog-photos` (portada, destino, sitio y promociones).

### Panama-Viajero-mobile (solo propuesta; espera confirmación)

1. `catalog-queries.ts` y `types.ts`: quitar `city_id`, `cities(...)`, `area_label`,
   coordenadas y `maps_query`; pedir `destination_province_id`, `address`, `maps_embed_url`,
   `service_tourist_sites(tourist_site_id)`, `lodging_profiles(*)`, `meal_plans(label)`,
   `hospedaje_types(label)`, los campos nuevos de habitaciones y restaurantes y
   `restaurant_hours`. En sitios, quitar `city_id` y `cities(name)`. En promociones, quitar
   `destination_city_id` y `cities(name)` y agregar los campos nuevos.
2. `booking-queries.ts`: `services(name, slug, category_id, destination_province_id)` y que el
   respaldo también atrape PGRST200.
3. Fotos: `service-media` para servicios y habitaciones, `destination-media` para destinos;
   sitios con URL completa se usan tal cual y con ruta van a `catalog-photos`.
4. Modelo: cambiar "ciudad" por provincia (destino) y sitio turístico en unos 25 archivos
   (`City`, `CITY_PROVINCE`, `getTouristSitesForCity`, filtros, búsqueda, `cities.tsx`).
   "Ciudades populares" pasa a leer `destinations`.
5. Ubicación: sin coordenadas, el mapa se abre con `maps_embed_url` o con el nombre del sitio
   en Google Maps (no hay `react-native-webview` instalado).
6. Comodidades de habitación desde `details.amenities` (texto separado por comas).
7. Mostrar la información de hospedaje, restaurante y restaurantes vinculados.
8. Proteger o retirar los scripts que escriben en producción y declarar `pv_admin` como fuente
   de las migraciones.
