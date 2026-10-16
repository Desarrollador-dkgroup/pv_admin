# Actualización de contenido compartido

Ambas aplicaciones usan la misma base de datos. La fuente de estas migraciones es padmin.
`npm run sync:content` copia el contrato y el SQL a `panama-viajero`.

## Aplicación manual

1. Abrir el editor SQL del proyecto correcto de Supabase.
2. Ejecutar `verify-lodging-restaurants.sql` para comprobar que la migración
   `202610150001` ya creó las galerías y tablas requeridas.
3. Si `202610150002` está aplicada, ejecutar solo
   `migrations/202610150003_restaurant_menu_link_and_gallery.sql`.
4. Si faltan objetos de `202610150001`, revisar su estado antes de ejecutarla;
   algunas columnas podrían existir por una aplicación parcial.
5. Ejecutar las consultas de verificación después de la migración.

`APLICAR_EN_SUPABASE.sql` contiene el historial desde una base vacía y sirve
solo para un entorno nuevo. No volver a ejecutarlo sobre producción.
La migración `202610150003` es idempotente y aplica el menú externo y el nuevo
límite de fotos para restaurantes.

## Hospedajes, restaurantes y galerías

- `lodging_profiles` agrega información operativa común sin inventar valores.
- `lodging_areas` organiza espacios como piscinas, parques y estacionamientos.
- La galería general admite 15 fotos por hospedaje y 30 por restaurante.
- Cada área y cada tipo de habitación admite hasta 10 fotos.
- Los platos y bebidas se guardan sin foto individual.
- Cada restaurante puede guardar un enlace externo para mostrar «Ver menú».
- Las galerías se guardan en Supabase Storage y la base conserva sus rutas.
- No se agrega texto alternativo a las fotos.
- Los administradores editan el catálogo; los miembros editan solo los servicios
  de sus negocios.
- Los proveedores envían servicios a revisión, pero no pueden publicarlos ni
  cambiar el negocio asignado.
- La web pública puede leer registros relacionados con servicios publicados.
- Storage usa el bucket público `service-media` y limita escrituras al negocio
  asociado a la primera carpeta de la ruta.

## Roles internos del panel

- La migración `202610150004_platform_account_roles.sql` agrega roles `owner`,
  `admin` y `collaborator`.
- La migración no crea ni elimina usuarios de Supabase Auth.
- La cuenta `owner` se registra manualmente desde el SQL Editor después de crear
  el usuario en Authentication.
- Solo puede existir una fila con `platform_role = 'owner'`.
- La aplicación impide que los roles internos cambien o eliminen esa fila.
- El rol `admin` administra el catálogo; `collaborator` queda limitado a
  permisos y membresías de proveedores.

## Promociones

- `description`: descripción detallada.
- `conditions`: condiciones de la oferta.
- `inclusions` y `exclusions`: listas de elementos incluidos y excluidos.
- `schedule_details`: horarios específicos de la promoción.
- `regular_price_cents`: precio habitual en centavos.
- `promotional_price_cents`: precio final en centavos.
- `discount_percent`: porcentaje calculado por PostgreSQL, con dos decimales.
- `currency`: USD.

Ejemplo de cálculo: 10000 centavos y 5000 centavos producen un descuento de 50%.
El formulario guarda los dos precios; no debe enviar `discount_percent`.
Ambos precios pueden quedar vacíos en las promociones anteriores.
No se transforman precios de texto existentes ni se inventan valores.

## Servicios con varias ubicaciones

`service_tourist_sites` vincula un servicio con varios sitios y prohíbe pares repetidos.
El campo anterior `services.tourist_site_id` se conserva como sitio principal.
Sus valores existentes se copian a la tabla nueva.

`set_service_tourist_sites` sustituye la selección de forma atómica.
El primer identificador representa el sitio principal y una lista vacía lo elimina.
Una selección inválida no modifica los registros.
La web consulta las asociaciones nuevas y el campo anterior, evitando duplicados.

La tabla nueva permite lectura de asociaciones de servicios publicados.
Su escritura y la función quedan cerradas para usuarios públicos y autenticados.
La función de sincronización del sitio principal usa privilegios del propietario:
solo mantiene una escritura que ya fue autorizada en `services`.
La migración `202610150002` define el acceso de administradores y miembros
autorizados, y añade políticas de lectura pública solo para servicios publicados.
Las políticas de las tablas existentes fuera del alcance de hospedajes,
restaurantes, servicios y catálogos no se modifican.

## Comprobaciones locales

Con Node.js 24, instalar el motor de pruebas separado de las dependencias de la aplicación:

```powershell
npm install --prefix .validation --no-save @electric-sql/pglite@0.5.9
node --test --test-concurrency=1 tests/migrations.test.mjs `
  tests/lodging-restaurants.test.mjs `
  tests/padmin-access.test.mjs tests/pricing.test.mjs `
  tests/restaurant-menu-gallery-migration.test.mjs
```

Las pruebas usan una base PostgreSQL temporal y no se conectan a Supabase.

Las pruebas de lectura pública se ejecutan con:

`node --test tests/public-content.test.mjs`

Este último comando requiere también la carpeta hermana `panama-viajero`.
