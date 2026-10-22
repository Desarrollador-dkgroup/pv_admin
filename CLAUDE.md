@AGENTS.md

# Panamá Viajero: panel (pv_admin)

Este archivo es la memoria compartida entre las sesiones de Claude en local y en la nube.
Lo que deba valer siempre se escribe aquí; el avance del día va en `docs/PROGRESO.md`.

## Sincronización local y nube (OBLIGATORIO)

El usuario trabaja en dos sitios: en su computadora (local) y en la nube (GitHub).
Ambos deben estar siempre iguales. Reglas estrictas:

1. **Al empezar cualquier sesión**: `git fetch origin`, comparar la rama de trabajo con
   `origin/main` y con su remota, e informar si hay commits sin traer o sin subir.
   Leer `docs/PROGRESO.md` antes de cambiar nada.
2. **Al terminar**: actualizar `docs/PROGRESO.md`, hacer commit y push.
3. **Recordar siempre al usuario**, al inicio y al final de cada tarea, que sincronice:
   push donde trabajó y pull en el otro lado antes de seguir. No omitir este aviso.
4. Si local y nube divergen, detenerse y avisar antes de seguir trabajando.
5. Rama de trabajo única: `fusion`, tanto en local como en la nube. No crear otras ramas
   sin que el usuario lo pida.
6. Lo que solo se dice en el chat no existe para la otra sesión: si es una decisión,
   se escribe aquí o en la bitácora.

## Flujo de ramas

- `main` es producción. `fusion` es la rama de trabajo e integración.
- Todo cambio se hace en `fusion`, se verifica y luego se pasa a `main`.
- Cuando `feat/merchant-dashboard`, `feat/merchant-panel` u otra rama de colaboradores
  reciba cambios: traerlos a `fusion` con merge, resolver conflictos, verificar con `tsc`
  y `eslint`, revisar si traen migraciones (no se aplican solas) y solo entonces pasar
  `fusion` a `main`. Avisar al usuario antes de subir a `main`.
- Nunca reescribir historia de `main` ni de ramas de otros (sin rebase ni force-push).

## Reglas de trabajo

- Trabajar en español. Comentarios en español. Líneas de 100 caracteres o menos.
- TypeScript sin `any`. ESLint 9 (configuración propia, sin `eslint-config-next`).
- Verificar en llamadas separadas: `timeout 170 npx tsc --noEmit -p .` y
  `timeout 170 npx eslint <archivos>`.
- No escribir claves en el código ni en el chat. `.env.local` no se sube.
- Commits en español, bien explicados pero breves: un título claro y, si hace falta,
  2 a 4 líneas de qué cambia y por qué. Sin listas largas ni detalles de más.
- No modificar la base de producción sin confirmación explícita del usuario.

## Proyecto

- Panel de administración y de propietarios. Next.js 16 (App Router; `params` y
  `searchParams` son Promises), React 19, Supabase, Tailwind 4.
- Despliegue: Cloudflare Workers con OpenNext (`wrangler.jsonc`, worker `padmin`).
  `npm run deploy`. La compilación usa Webpack (`--webpack`).
- Secretos en Cloudflare: `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, sin `NEXT_PUBLIC_`).
- El sitio público es el repo `panama-viajero`; ambos comparten la misma base.

## Supabase

- Producción: proyecto `qqhcsacdffdxcbkzgulk`. Se trabaja con SQL manual en el SQL Editor.
- Este repo es la fuente de las migraciones (`supabase/migrations/`).
  `npm run sync:content` copia tipos y SQL a `../panama-viajero` (requiere ambos repos).
- `APLICAR_EN_SUPABASE.sql` es solo para una base vacía; no ejecutarlo en producción.
- Todo cambio hecho a mano en producción debe pasar a una migración del repo.
- Negocio de prueba: `b2996846-c6ec-43dc-ae69-192fcbf85d75` ("Negocio de PROPIETARIO").
  Su cuenta es propietaria principal. Los planes se cambian por SQL.

## Mapa del código

- Acciones del servidor: `src/app/panel/**/actions.ts` (servicios en `src/app/panel/actions.ts`).
- Acceso y roles: `src/lib/panel-access.ts`, `src/lib/panel-permissions.ts`.
- Estados de servicio: `src/lib/panel-labels.ts` (`ownerStateOf`).
- Editor de servicios: `src/components/service-editor-form.tsx`,
  `src/components/lodging-form-fields.tsx`, `src/components/panel-own-service-status.tsx`.
- Clientes Supabase: `src/lib/supabase-server.ts`, `src/lib/supabase-admin.ts`.
- `/vista-previa` es una demo local que no escribe en Supabase.
