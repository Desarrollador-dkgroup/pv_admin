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

## Acceso real a Supabase

`/acceso` permite iniciar sesión y recuperar una cuenta existente con Supabase Auth.
`/panel` verifica el usuario en el servidor y consulta `platform_admins` y
`business_members` para determinar su acceso. Muestra servicios reales en modo lectura.

La interfaz de edición todavía no escribe en Supabase. Antes de habilitarla se deben
revisar las políticas RLS y conectar cada formulario con el contrato de datos real.
La contraseña temporal obligatoria y las invitaciones reales requieren un flujo
administrativo de servidor; la simulación no constituye una comprobación de seguridad.

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
