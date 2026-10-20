# padmin

Interfaz administrativa de Panamá Viajero basada en el prototipo de Figma.

## Pantallas e interacción

- `/`: formulario de acceso con dos cuentas públicas de prueba, sin selección de rol.
- `/vista-previa/admin`: inicio, propietarios, negocios, servicios, sitios y promociones.
- `/vista-previa/propietario`: inicio, mi negocio, mis servicios y mis promociones.
- Ambos recorridos incluyen cuenta, formularios, galería y selección de varios sitios.
- Los servicios tienen campos distintos para hospedajes, restaurantes, actividades,
  transporte y tours. Hospedajes incluyen habitaciones; restaurantes incluyen menú.
- El administrador tiene revisión de contenido, historial e invitaciones ilustrativas.
- Las promociones validan fechas y precios y calculan el porcentaje de descuento.
- Inicio del administrador permanece visible, pero está temporalmente desactivado.
- Propietarios muestra activos por defecto; permite suspendidos y todos.
- Negocios muestra su propietario y categorías, e incluye el filtro Cliente.
- Los sitios muestran nombre, país y destino (provincia), sin duplicar el nombre del sitio.
- Los listados únicamente permiten editar; sus enlaces abren en la pestaña actual.
- La campana muestra hasta tres avisos y enlaza a Notificaciones, debajo de Promociones.
- Los avisos se derivan de los estados locales; cada propietario ve solo los de su negocio.

La vista previa utiliza registros ilustrativos identificados como tales. Sus cambios
se guardan en el navegador y pueden restablecerse desde Mi cuenta. Las invitaciones,
contraseñas y solicitudes de sitios simulan el recorrido; no envían mensajes ni crean
usuarios. No introducir datos personales reales en este recorrido.

El acceso local determina el rol a partir del correo y contraseña de la misma cuenta.
Las credenciales de prueba se muestran debajo de sus campos y no se envían a Supabase.
El enlace anterior `/vista-previa/acceso` redirige al formulario de `/`.

## Panel real por rol

Después de iniciar sesión, cada rol ve su propio menú y su portada, validados en Supabase:

- Propietario principal y admin: resumen con indicadores reales, Revisión, Servicios,
  Negocios, Propietarios, Sitios turísticos, Promociones, Notificaciones y Permisos.
- Colaborador: inicio con propietarios y negocios, gestión de propietarios, Negocios,
  Notificaciones y Permisos de su alcance.
- Propietario de negocio: Mi panel, Mis establecimientos, Mis servicios, Mis promociones y avisos.

La pantalla de acceso real es única (`/acceso`, también accesible desde `/`). El rol
sale de la cuenta autenticada, nunca de un selector en el formulario. Una misma cuenta
de comercio puede tener varios negocios asignados en `business_members` y verá todos
en su portada, con enlaces a cada servicio. Panamá Viajero asigna los negocios y crea
los servicios iniciales; el comercio no puede crear servicios de categorías nuevas.

Los miembros de un negocio editan nombre público, descripciones, destino, dirección,
mapa, amenidades y detalles propios de cada servicio en «Mis servicios». La
galería de cada servicio permite fotos generales y, en hospedajes, fotos por habitación;
«Habitaciones y unidades» administra capacidad, camas, inventario y tarifas. Restaurantes
incluyen su menú. Las fichas ya publicadas conservan su publicación cuando su miembro
guarda información nueva, para que el catálogo compartido pueda mostrarla; los servicios
nuevos siguen siendo asignados y publicados por el equipo. El estado de activación del
negocio y la asignación de cuentas siguen reservados a Panamá Viajero.

La migración `202610200001_provider_assigned_services.sql` cierra INSERT directo de
servicios para comerciantes en la base. **Debe aplicarse al proyecto compartido antes
de usar esta versión del panel con comercios reales**; comprueba primero el esquema
del proyecto y coordina la aplicación con el equipo móvil y web. La UI y la acción
del servidor también rechazan la creación, pero no sustituyen esa política RLS.

La matriz de gestión de cuentas está en `src/lib/panel-permissions.ts`.
Las reglas de la base de datos están en `supabase/migrations/`.

## Acceso real a Supabase

`/acceso` permite iniciar sesión y recuperar una cuenta existente con Supabase Auth.
`/panel` verifica el usuario en el servidor y consulta `platform_admins` y
`business_members` para determinar su acceso. Los formularios reales de servicios,
galerías, habitaciones y menú escriben en Supabase con la sesión del usuario y las
políticas RLS. Requieren el esquema y las variables de entorno configurados. La ruta
`/vista-previa` sigue siendo ilustrativa y guarda sus cambios solo en el navegador.

Copiar `.env.example` a `.env.local` y completar las variables públicas.
No publicar claves privadas en variables con prefijo `NEXT_PUBLIC_`.

## Desarrollo

- Instalar dependencias: `npm install`.
- Iniciar el servidor: `npm run dev`.
- Revisar código: `npm run lint` y `npm run typecheck`.
- Compilar: `npm run build`.

Los colores y los iconos se tomaron del diseño. La fuente Inter está alojada localmente.
El diseño se adapta a escritorio, tablet y móvil, con movimiento reducido cuando
el sistema lo solicita. La galería local acepta JPG, PNG o WebP de hasta 1 MB por imagen.

## Cloudflare Workers

La configuración utiliza Next.js y el adaptador OpenNext.

- Compilar para Workers: `npm run build:cloudflare`.
- Probar en el entorno de Workers: `npm run preview`.
- Iniciar sesión: `npx wrangler login`.
- Publicar: `npm run deploy`.

Repositorio previsto: https://github.com/Edwin-Jimenez12/pv_admin

El propietario gestiona la conexión con GitHub y el despliegue.
La compilación usa Webpack por un fallo de Turbopack al procesar Tailwind en Windows.

## Contenido compartido

El SQL de promociones y sitios múltiples está en `supabase/APLICAR_EN_SUPABASE.sql`.
Consultar `supabase/README.md` antes de aplicarlo. Las funciones de datos están en
`src/lib/content-repository.ts`. El contrato se sincroniza con `npm run sync:content`.

## Dependencias corregidas

La configuración de ESLint usa las reglas oficiales de TypeScript y React Hooks.
Se sustituyó `eslint-config-next` porque incorpora `braces`, sin parche disponible.
Esto elimina también las reglas específicas del plugin de Next.js.
OpenNext usa un override de `glob` dentro de `@node-minify/core` para resolver su aviso.
Verificar periódicamente con `npm audit` y revisar el override al actualizar OpenNext.
