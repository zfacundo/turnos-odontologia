# Design

## Context

Ver `proposal.md` para la motivación. El estado actual tiene `Paciente` con solo `id`, `nombre`, `dni` y `telefono`; `PacienteRepository` ya garantiza DNI único con `DNI_DUPLICADO`; el middleware de errores traduce `FalloDeRegla` a `409` y no conoce una dimensión de obra social; `src/api/app.ts` monta los routers de los changes previos; y `src/simulators/mercadopago/` es la referencia de simulador determinista con `simulado: true`, aviso de simulación, repo en memoria y router factory con inyección de dependencias.

Restricciones: Zona de la ficha C-08, stack TypeScript strict, dominio puro sin I/O, datos ficticios (RN-DA-01), sin llamadas de red y rotulación «SIMULACIÓN» (RN-SM-04), mapeo DD-08 y TDD con nombres dado/cuando/entonces.

## Goals / Non-Goals

**Goals:**

- Cerrar las 8 decisiones del relevamiento y los 3 ajustes posteriores dentro del spec aprobado, sin reabrirlos en Apply.
- Mantener el mismo patrón de módulo simulado usado por C-11, pero aplicado a padrón de obra social.
- Reutilizar `PacienteRepository` y el middleware de errores existentes sin cambiar su contrato.
- Dejar una superficie HTTP verificable con supertest y una pantalla de demostración local.
- Sostener contratos HTTP coherentes para alta, actualización y consulta, con `400`/`409` inequívocos y un único enmascaramiento centralizado.

**Non-Goals:**

- No implementar facturación/ARCA (C-12), ni envío real de WhatsApp (C-06).
- No validar la obra social de la ficha contra el padrón: es dato descriptivo.
- No introducir autenticación real, persistencia en disco ni dependencias nuevas.
- No corregir los 14 fallos preexistentes de auditoría/odontograma: se reportan, no se absorben en este change.
- No ofrecer `PATCH` parcial: la actualización es un reemplazo completo con `PUT`.

## Decisions

- **D1 — Código de DNI duplicado (decisión 1 del relevamiento).** Se conserva `DNI_DUPLICADO`, ya usado por `PacienteRepository`, con `error.dimension = 'paciente'` y `conflicto` ausente. Alternativa descartada: inventar `RN-PA-xx`, que no existe en la KB y violaría la regla de no inventar.
- **D2 — Modelo de paciente (decisión 2).** Se amplía `Paciente` con `email?`, `obraSocialId?` y `nroAfiliado?`, todos opcionales y con formato ficticio verificable (`@ejemplo.invalid`, `OS-\d{2}`, `AF-\d{4}`). La obra social se guarda como texto descriptivo y no se consulta el padrón al dar de alta o actualizar. Alternativa descartada: no tocar la entidad; dejaría US-030 sin cobertura. `src/domain/pacientes/paciente.ts` se marca como archivo compartido en `proposal.md`.
- **D3 — Formato del padrón (decisión 3).** `AfiliadoSimulado` expone `cobertura` y `copagoPct` como enteros 0-100 y `planes` como arreglo de strings. Los casos se seleccionan por `nroAfiliado`: `AF-0001` activo (80/20), `AF-0002` con copago (60/40), `AF-0003` sin cobertura (0/100) y `AF-0004` error simulado. Alternativa descartada: porcentajes decimales y reglas de copago dinámicas, que complicarían los tests sin aportar al TP.
- **D4 — Mensaje de no encontrado (decisión 4).** Se usa exactamente `afiliado no encontrado`, según RN-SM-02 y la ficha C-08, no la variante «no encontrado» del Flujo 8. Alternativa descartada: mensaje genérico, más débil para la UI.
- **D5 — RBAC (decisión 5).** Ficha: altas y actualizaciones `admin`/`recepcion`, consultas `admin`/`recepcion`/`odontologo`, `paciente` denegado por HTTP porque no existe vínculo usuario-paciente; C-06 seguirá usando casos de uso directos. Cobertura: los cuatro roles pueden consultar, porque la matriz lo permite y el padrón es ficticio. Sin `X-Rol`, `403` en ambos. Alternativa descartada: implementar ahora el vínculo paciente-propio, fuera de esta Zona.
- **D6 — Tests de API (decisión 6).** Se incluyen `tests/api/pacientes.test.ts` y `tests/simulators/obras-sociales/api.test.ts`, aunque el primero queda fuera de la Zona literal de `CHANGES.md:369`; se documenta en `proposal.md` para aprobación del team lead. Alternativa descartada: dejar la API sin tests de integración.
- **D7 — Formato de DNI del seed (decisión 7).** Se mantiene `99xxxxxx` y `^99\d{6}$` ya implementados y especificados en `datos-ficticios`; no se edita la KB en este change. Alternativa descartada: adoptar `00.000.0NN`, que rompería los tests vigentes.
- **D8 — `ErrorDeRegla.dimension` (decisión 8).** No se extiende la unión; los errores del padrón omiten `dimension` y el error de DNI usa `paciente`. Alternativa descartada: agregar `'obra-social'` a `src/domain/shared/result.ts`, un archivo compartido sin beneficio observable.
- **D9 — Enmascaramiento.** El enmascaramiento de `dni` y `telefono` vive en la capa de respuesta HTTP (`src/application/pacientes/pacientePublico.ts`), no en el dominio ni en el repositorio; el caso de uso `buscarOCrearPorTelefono` de C-06 sigue recibiendo el teléfono completo. Alternativa descartada: guardar ya enmascarado, que impediría reutilizar el repositorio.
- **D10 — Arquitectura del simulador.** Módulo autónomo en `src/simulators/obras-sociales/` con tipos puros, repo en memoria con copias defensivas, caso de uso con `Result` y router factory `obrasSocialesRouter(deps, repo = new ...)`, espejo de C-11. Alternativa descartada: mezclarlo con `src/application/pacientes/`, que acoplaría dos capacidades distintas.
- **D11 — Montaje en `app.ts`.** Se requieren 4 líneas aditivas (2 imports y 2 `app.use`), no las 2 previstas en la ficha, porque hay dos routers nuevos. Se explicita en `proposal.md` para revisión del team lead; se mantienen los montajes de auditoría/odontograma de C-09/C-10. Alternativa descartada: un único router agregador, que oscurecería la trazabilidad por change.
- **D12 — Especificación.** Se crean `ficha-paciente` y `cobertura-obra-social-simulada`, y se agrega un requisito nuevo a la capacidad existente `datos-ficticios` para el alta y actualización por API. Alternativa descartada: duplicar las reglas de datos ficticios dentro de `ficha-paciente`.
- **D13 — Actualización de ficha (ajuste 1).** Se usa `PUT /api/pacientes/:id` como reemplazo completo con las mismas validaciones del alta. Conservar el DNI propio es válido e idempotente y devuelve `200`; asignar el DNI de otro paciente devuelve `409 DNI_DUPLICADO`; un id inexistente devuelve `404 paciente no encontrado`. Alternativa descartada: `PATCH` parcial, que exigiría definir qué ocurre con los campos omitidos.
- **D14 — Entrada malformada versus error simulado (ajuste 2).** `400` con `error.tipo = 'entrada'` para `nombre`/`dni` vacíos o con solo espacios, `email` inválido y parámetro `nro` faltante o vacío; `409` con `error.tipo = 'regla'` y `RN-SM-02` solo para `AF-0004`. Alternativa descartada: responder `404` para `%20`, que confundiría una entrada inválida con un afiliado inexistente.
- **D15 — Enmascaramiento compartido (ajuste 3).** Un único `pacientePublico` se aplica a listado, detalle y respuesta de `PUT`; la versión enmascarada nunca se persiste. Alternativa descartada: enmascarar por separado en cada ruta, con riesgo de divergencia entre representaciones.

## Risks / Trade-offs

- [El merge de C-07 no está en la rama actual] → Rebasar `master` antes de Apply y verificar que el `app.ts` resultante conserve los cuatro montajes nuevos y los de C-09/C-10.
- [Baseline rojo con 14 fallos de auditoría/odontograma] → Ejecutar primero los tests puntuales de C-08 y reportar los fallos ajenos como preexistentes; no modificar esos módulos.
- [Campos compartidos `Paciente` y `app.ts`] → Cambios aditivos y visibles en `proposal.md`; requerir revisión del team lead antes del merge.
- [Enmascaramiento puede confundir al demo] → Documentar en la UI que el DNI y teléfono se muestran parcialmente y que todos los valores son ficticios.
- [Error simulado usa `RN-SM-02`] → Es un código existente y evita tocar `result.ts`; el mensaje aclara que es una falla simulada, no una regla de negocio real.
- [Confusión entre `400` y `409` en los edge cases] → Los specs y los tests verifican explícitamente `error.tipo` y `error.regla` para cada caso, incluido el contraste `AF-0004` frente a `nro` faltante.

## Migration Plan

- No hay migración de datos: los repositorios en memoria se reconstruyen en cada arranque y los campos nuevos son opcionales.
- Implementación por capas: tipos y puerto → repositorio/caso de uso → router → montaje → UI → tests, con tests rojos antes de cada avance.
- `PUT` no crea registros nuevos: repetir la misma petición con el DNI propio es idempotente; usar un DNI ajeno se resuelve con `409`.
- Rollback: revertir las 4 líneas de `src/api/app.ts`, los 3 campos opcionales de `src/domain/pacientes/paciente.ts` y eliminar los archivos nuevos; no hay efectos persistentes.

## Open Questions

Ninguna: las 8 decisiones del relevamiento y los 3 ajustes posteriores quedan cerrados en D1-D15.
