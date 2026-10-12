# Actualización de contenido compartido

Ambas aplicaciones usan la misma base de datos. La fuente de estas migraciones es padmin.
`npm run sync:content` copia el contrato y el SQL a `panama-viajero`.

## Aplicación manual

1. Abrir el editor SQL del proyecto correcto de Supabase.
2. Ejecutar `APLICAR_EN_SUPABASE.sql` una sola vez.
3. Ejecutar `verify-content.sql`: deben aparecer nueve columnas y cero asociaciones faltantes.

El archivo completo usa una transacción: un error revierte todos sus cambios.
No ejecutar después los archivos individuales sobre la misma base.
Los archivos de `migrations/` son la alternativa para un flujo con Supabase CLI.
Repetir una migración provoca un error de objetos existentes; no borra información.

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
Los permisos de edición del padmin se definirán posteriormente.
No se modifican las políticas RLS de las tablas existentes.

## Comprobaciones locales

Con Node.js 24, instalar el motor de pruebas separado de las dependencias de la aplicación:

```powershell
npm install --prefix .validation --no-save @electric-sql/pglite@0.5.9
node --test tests/migrations.test.mjs tests/pricing.test.mjs
```

Las pruebas usan una base PostgreSQL temporal y no se conectan a Supabase.

Las pruebas de lectura pública se ejecutan con:

`node --test tests/public-content.test.mjs`

Este último comando requiere también la carpeta hermana `panama-viajero`.
