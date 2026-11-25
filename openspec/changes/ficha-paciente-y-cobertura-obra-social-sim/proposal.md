# Proposal

## Why

El sistema ya registra turnos y consulta huecos, pero todavía no expone una ficha de paciente consultable y editable por API ni una consulta simulada de cobertura de obra social; por eso US-030, US-061 y el Flujo 8 del Discovery quedan sin cubrir y no se puede demostrar localmente cómo se calcula una cobertura sin contactar un padrón real.

Este change cierra esas dos brechas con el mismo patrón determinista de los otros simuladores, reutilizando repositorios en memoria y respetando RN-DA-01/02 y DD-08.

## What Changes

- Alta, actualización y consulta de pacientes por HTTP: `POST /api/pacientes`, `PUT /api/pacientes/:id`, `GET /api/pacientes` y `GET /api/pacientes/:id`, con DNI único y datos ficticios validados en el borde.
- Extensión aditiva y opcional de la entidad `Paciente` con `email?`, `obraSocialId?` y `nroAfiliado?`; la obra social se guarda como dato descriptivo, sin validarla contra el padrón simulado.
- Respuestas de ficha con DNI y teléfono enmascarados de igual forma en listado, detalle y actualización, sin alterar los datos crudos en memoria.
- Endpoint simulado `GET /api/sim/obras-sociales/afiliados/:nro` con cobertura, porcentaje de copago y planes; casos configurables: `activo`, `con_copago`, `sin_cobertura` y `error_simulado`.
- Pantalla `public/sim/obras-sociales.html` con rótulo visible «SIMULACIÓN», sin llamadas de red externas.
- Restricciones por rol para altas, actualizaciones y consultas, con `403` cuando el rol no está habilitado.
- Tests unitarios de dominio/casos de uso, tests de repositorio simulado, tests de API de pacientes y obra social, y test del seed ficticio ampliado.

## Capabilities

### New Capabilities

- `ficha-paciente`: alta, actualización, búsqueda y consulta de fichas de paciente por API, con unicidad de DNI, enmascaramiento de datos y permisos por rol.
- `cobertura-obra-social-simulada`: consulta determinista y local de afiliados, cobertura, copago y planes, con casos de error simulados y sin integraciones reales.

### Modified Capabilities

- `datos-ficticios`: agrega el requisito de que los datos aceptados por la API de alta y actualización de pacientes también deban ser ficticios y verificables, no solo los del seed.

## Impact

- Código nuevo en `src/application/pacientes/`, `src/api/routes/pacientes.ts`, `src/simulators/obras-sociales/` y `public/sim/obras-sociales.html`.
- Archivos compartidos a revisar por el team lead: `src/api/app.ts` (4 líneas aditivas: 2 imports y 2 `app.use`; la ficha preveía 2, pero hay dos routers nuevos), `src/domain/pacientes/paciente.ts` (3 campos opcionales aditivos) y `tests/api/pacientes.test.ts` (fuera de la Zona listada en `CHANGES.md:369`, incluido por pedido explícito).
- Sin dependencias nuevas, sin I/O real y sin base de datos: se reutilizan los repositorios en memoria existentes y el `Clock` inyectado.
- DD-08: `400` para entrada malformada (vacíos/espacios, email inválido, parámetro de cobertura faltante), `403` permisos, `404` no encontrado y `409` para reglas de negocio (`DNI_DUPLICADO` y error simulado `RN-SM-02` de `AF-0004`); el tipo `ErrorDeRegla` no se modifica.
- El contrato de `Paciente` es retrocompatible: los campos nuevos son opcionales y ningún change previo deja de compilar.
- Contexto de entrega: C-07 aún no está mergeado en master y el `npm test` baseline tiene 14 fallos preexistentes en auditoría/odontograma; ninguno es causado por este change ni debe mezclarse con su verificación.
