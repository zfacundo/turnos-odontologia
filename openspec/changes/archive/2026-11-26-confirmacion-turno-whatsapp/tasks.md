# Tasks

> Strict TDD: cada tarea de código sigue RED → GREEN → TRIANGULATE → REFACTOR. Tests con nombre «dado … cuando … entonces …», datos ficticios del seed (`cargarSeed(new RelojFijo(...))`), repositorios en memoria reales, sin mocks de dominio ni repos. Governance MEDIUM: `src/api/routes/turnos.ts` es compartido (cambio acotado, revisión del team lead).

## 1. Red de seguridad

- [x] 1.1 Correr `npx vitest run` y registrar la línea base (hoy 1284 tests en verde); si algo falla, frenar y reportarlo como falla preexistente
- [x] 1.2 Correr `npm run typecheck` y verificar que pasa sin errores antes de tocar código

## 2. Bandeja neutral de mensajes simulados

- [x] 2.1 RED: en `tests/simulators/whatsapp/bandejaSimulada.test.ts`, tests de `registrarMensajeSimulado` / `consultarMensajesSimulados` (dado un mensaje registrado para un teléfono, cuando se consulta ese teléfono, entonces se devuelve con id; cuando se consulta otro teléfono u otra instancia de `Deps`, entonces la lista está vacía; dos mensajes conservan el orden y tienen ids distintos); verificar que fallan porque el módulo no existe
- [x] 2.2 GREEN: crear `src/simulators/whatsapp/bandejaSimulada.ts` moviendo la `WeakMap` y el contador desde `avisosCancelacion.ts`; verificar que los tests de 2.1 pasan
- [x] 2.3 REFACTOR: `avisosCancelacion.ts` conserva su API (`AvisoCancelacion`, `registrarAvisoCancelacion`, `consultarAvisosCancelacion`) delegando en la bandeja; verificar que `tests/simulators/whatsapp/avisosCancelacion.test.ts` y `tests/simulators/whatsapp/api.test.ts` siguen verdes sin modificarlos

## 3. Mensaje de confirmación puro

- [x] 3.1 RED: en `tests/simulators/whatsapp/confirmacionTurno.test.ts`, test del escenario «Texto exacto con hora de Buenos Aires» para `mensajeConfirmacionTurno({ paciente, profesional, prestacion, inicio })` con inicio `2026-12-01T13:00:00Z` y el texto exacto del spec (comparando con espacios normalizados); verificar que falla
- [x] 3.2 GREEN: crear `src/simulators/whatsapp/confirmacionTurno.ts` con `mensajeConfirmacionTurno` pura (sin `Date.now()`/`new Date()`, `Intl.DateTimeFormat` es-AR, `America/Argentina/Buenos_Aires`, cierre `¡Te esperamos!`); verificar que el test pasa
- [x] 3.3 TRIANGULATE: agregar casos del escenario «Cierre con signo de apertura correcto» (otro paciente/fecha: empieza con `Hola, <paciente>.`, termina con `¡Te esperamos!`, no contiene `?Te esperamos!`) y un inicio cercano a medianoche UTC que cae el día anterior en Buenos Aires; verificar que todos pasan

## 4. Registro de la confirmación (caso del simulador)

- [x] 4.1 RED: tests de `registrarConfirmacionTurno(deps, turno, usuario, registrar?)` con `cargarSeed(new RelojFijo(new Date('2026-11-30T09:00:00-03:00')))` y turnos creados con `crearTurno` real: recepción + origen recepción → registra el texto exacto en el teléfono del paciente y devuelve `true`; verificar que falla
- [x] 4.2 GREEN: implementar `registrarConfirmacionTurno` (condición origen/rol/teléfono, nombres desde repos con fallback a ids, registro con `registrarMensajeSimulado` por defecto); verificar que pasa
- [x] 4.3 TRIANGULATE: casos admin → registra; origen `whatsapp` → no registra; rol paciente → no registra; paciente guardado con `telefono: ''` en el repo en memoria → no registra y devuelve `false`; profesional y prestación inexistentes → el texto usa los ids (escenario «Profesional o prestación inexistentes»); `registrar` que lanza → no propaga la excepción y devuelve `false` (escenario «Falla al registrar la confirmación»); verificar que todos pasan

## 5. Ruta Express sin lógica de confirmación

- [x] 5.1 RED: en `tests/api/confirmacion-turno-whatsapp.test.ts` (supertest), `POST /api/turnos` como recepción con `pac-01` → `201` y `GET /api/sim/whatsapp/avisos?telefono=+54 9 11 0000-0001` devuelve `simulado: true` y un aviso con el texto exacto terminado en `¡Te esperamos!`; verificar que falla por el `?` actual
- [x] 5.2 GREEN/REFACTOR: en `src/api/routes/turnos.ts` reemplazar el bloque `CONFIRMACION_AGENDA_WHATSAPP` por una única llamada `registrarConfirmacionTurno(deps, resultado.valor, usuario)` antes del `201`, y quitar el import de `registrarAvisoCancelacion` solo si ya no se usa (lo sigue usando cancelar); verificar que 5.1 pasa
- [x] 5.3 TRIANGULATE (API): admin → confirmación registrada; origen `whatsapp` → sin aviso; usuario rol paciente → sin aviso; alta `409` (solapamiento), `400` (paciente inexistente) y `403` (odontólogo) → sin aviso; teléfono `+54 9 11 0000-0002` no ve la confirmación de `pac-01`; crear + cancelar → dos avisos, confirmación primero; verificar que todos pasan
- [x] 5.4 Corregir acentos rotos en comentarios tocados (`recepci?n`, `confirmaci?n`) y verificar con `git grep -n "?n\b\|?Te esperamos" src tests` que no queda ninguno

## 6. Verificación integral y entrega

- [x] 6.1 Correr `npx vitest run` (todos en verde: línea base + nuevos) y `npm run typecheck` sin errores; `tests/simulators/whatsapp/avisosCancelacion.test.ts` sin modificaciones
- [x] 6.2 Verificación manual en navegador (la hace el orquestador): crear un turno desde la agenda del panel como recepción y ver en la pantalla del bot, con el teléfono del paciente, la burbuja terminada en «¡Te esperamos!» **Verificado 2026-11-26 (team lead)** con `npm run dev`, seed y `SIM_NOW=2026-12-01T08:00:00-03:00`: como Recepcionista Ficticia, desde "+ Nuevo turno" de la agenda se creó el turno de Paciente Ficticio Uno, martes 1/12 16:00, Dra. Ficticia Perez, Control y limpieza. En `/bot.html` con `+54 9 11 0000-0001` apareció "Hola, Paciente Ficticio Uno. Tu turno del 1/12/26, 4:00 p. m. con Dra. Ficticia Perez para Control y limpieza fue agendado correctamente. ¡Te esperamos!". Con `+54 9 11 0000-0002` no apareció ningún aviso. Al cancelar el turno quedaron dos avisos en orden: confirmación (id 1) y cancelación (id 2).
- [x] 6.4 Corrección relacionada encontrada en la verificación (mismo problema de codificación del PR #35): el selector de `/bot.html` mostraba "+54 9 11 0000-0001 ? Paciente Ficticio Uno". Se restauró el separador " · " del formato original en `public/js/bot.js` y el acento de un comentario en `public/admin/js/clientes.js` ("válidos"). TDD: dos tests nuevos en `tests/simulators/whatsapp/pantalla.test.ts` (rojo → verde). Suite: 1309 en verde.
- [x] 6.3 Escribir el handoff `knowledge-base/entrega/confirmacion-turno-whatsapp.md`: spec retroactivo del PR #35 (Integrante 4), qué se movió y dónde, corrección del `¡`, que toca el archivo compartido `turnos.ts`, cómo se verificó y preguntas abiertas (teléfonos sin enmascarar en `GET /api/sim/whatsapp/contactos`, extraer el aviso de cancelación inline)

## Workflow follow-up

- PR con la plantilla `.github/pull_request_template.md`, revisión del team lead y merge.
- Archivar el change con `/opsx:archive` después del merge.
