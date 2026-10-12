# padmin

Base del proyecto administrativo de Panamá Viajero.

## Desarrollo

- Instalar dependencias: `npm install`.
- Iniciar el servidor: `npm run dev`.
- Revisar código: `npm run lint` y `npm run typecheck`.
- Compilar: `npm run build`.

## Cloudflare Workers

La configuración utiliza Next.js y el adaptador OpenNext.

- Compilar para Workers: `npm run build:cloudflare`.
- Probar en el entorno de Workers: `npm run preview`.
- Iniciar sesión: `npx wrangler login`.
- Publicar: `npm run deploy`.

Repositorio previsto: https://github.com/Edwin-Jimenez12/pv_admin

El propietario gestionará la conexión con GitHub y el primer despliegue.
La compilación usa Webpack por un fallo de Turbopack al procesar Tailwind en Windows.

## Supabase

Copiar `.env.example` a `.env.local` y completar las variables públicas.
La autenticación, los permisos y los módulos se definirán posteriormente.
No publicar claves privadas en variables con prefijo `NEXT_PUBLIC_`.

## Contenido compartido

El SQL de promociones y sitios múltiples está en `supabase/APLICAR_EN_SUPABASE.sql`.
El propietario lo ejecutará en Supabase. Consultar `supabase/README.md` antes de aplicarlo.
Las funciones de datos están en `src/lib/content-repository.ts` y no crean vistas administrativas.
El contrato compartido se sincroniza con `npm run sync:content`.

## Dependencias corregidas

La configuración de ESLint usa las reglas oficiales de TypeScript y React Hooks.
Se sustituyó `eslint-config-next` porque incorpora `braces`, sin parche disponible.
Esto elimina también las reglas específicas del plugin de Next.js.
OpenNext usa un override de `glob` dentro de `@node-minify/core` para resolver su aviso.
Verificar periódicamente con `npm audit` y revisar el override al actualizar OpenNext.
