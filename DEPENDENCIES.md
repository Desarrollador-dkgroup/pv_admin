# Avisos de dependencias corregidos

La auditoría inicial de padmin reportó nueve paquetes afectados por dos problemas.

| Origen | Paquetes afectados | Corrección |
| --- | --- | --- |
| braces | braces, micromatch, fast-glob, @next/eslint-plugin-next, eslint-config-next | Sustituir la configuración de lint |
| glob | glob, @node-minify/core, @opennextjs/aws, @opennextjs/cloudflare | Override compatible de glob 10.5.0 |

## braces

El aviso GHSA-vfj7-8cjw-p6xm afecta a braces hasta 3.0.3 y no tiene parche publicado.
Su procesamiento recursivo puede agotar la pila con patrones profundamente anidados.
Se eliminó la cadena que lo introducía a través de eslint-config-next.
Las reglas oficiales de JavaScript, TypeScript y React Hooks siguen activas.
Las reglas específicas del plugin de Next.js quedan fuera de esta configuración.

Fuente: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm

## glob

El aviso GHSA-5j98-mcp5-4vw2 afecta a glob desde 10.2.0 hasta antes de 10.5.0.
La vulnerabilidad está en la ejecución de comandos del CLI mediante --cmd.
OpenNext incorporaba glob 10.3.3 a través de @node-minify/core.
El override conserva la versión mayor y exige glob 10.5.0 para esa dependencia.
No se degradaron Next.js ni OpenNext.

Fuente: https://github.com/advisories/GHSA-5j98-mcp5-4vw2

## Validación

- npm audit: cero vulnerabilidades reportadas en padmin.
- ESLint y TypeScript: sin errores.
- Compilación de Next.js y generación del Worker con OpenNext: correctas.

Esta corrección corresponde a padmin y no modifica las dependencias de la web pública.
Revisar el override cuando se actualice OpenNext.
