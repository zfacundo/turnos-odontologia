# Tasks

> TDD estricto: en cada tarea primero el test rojo (nombre "dado … cuando … entonces …"), luego el mínimo código verde, triangular y refactorizar. Sin mocks de dominio ni repositorios; solo `RelojFijo` (y un publicador de eventos en memoria definido en el test). Fechas fijas con offset `-03:00`, reloj base `2026-11-30T09:00:00-03:00`. Solo se tocan archivos de la Zona; `src/api/routes/turnos.ts` solo de forma aditiva.

## 1. Safety net

- [x] 1.1 Correr `npm test` y `npm run typecheck` y registrar el baseline de tests verdes de C-01 + C-02 + C-03; si algo falla, detenerse y reportarlo como falla preexistente (no corregirla).

## 2. Aplicación — reprogramarTurno (camino feliz y exclusión del propio turno)

- [x] 2.1 En `tests/application/agenda/reprogramarTurno.test.ts` (seed + `RelojFijo` + `crearTurno` real para `T`), test rojo: recepción reprograma `T` a `10:15` → aceptado, `T` de `10:15` a `10:45`, mismo id, persistido (`buscarPorId`); crear `src/application/agenda/reprogramarTurno.ts` con la firma de design D1 hasta verde.
- [x] 2.2 Triangular con los escenarios de "Datos de la reprogramación" y otros horarios: reprogramar a `11:00` conserva id, `pac-01`, `prest-control`, estado, `creadoPor`, `creadoEn` y fija `actualizadoEn` = reloj; mover al `2026-12-02 15:00`; mover pegado a `U` (`10:30`–`11:00`) → aceptado; generalizar (design D3/D4) hasta verde.

## 3. Aplicación — reglas de agenda (RN-AG-01..05)

- [x] 3.1 Tests rojos de conflictos con `U`/`V` creados por `crearTurno`: mismo sillón → `RN-AG-02` `sillon` con `conflicto.turnoId` de `U`; mismo profesional (`11:15`) → `RN-AG-02` `profesional`; paciente con `V` → `RN-AG-05` `paciente`; en todos `T` sigue `10:00`–`10:30`; implementar la llamada a `validarNuevoTurno` con la lista filtrada sin el propio turno hasta verde.
- [x] 3.2 Tests de franja, bloqueo y alineación: `12:45` → `RN-AG-04`; `18:30` → `RN-AG-04` (bloqueo urgencias); `10:10` → `RN-AG-03`; verificar que pasan sin código nuevo o completar hasta verde.
- [x] 3.3 Tests de cambio de profesional/sillón (design D2/D3): mismo horario en `sillon-2` → aceptado con `prof-1`; `prof-2` a `11:00` → aceptado en `sillon-1`; `prof-2` ocupado por `U` a `10:00` → `RN-AG-02` `profesional`; `prof-inexistente` (y `sillonId` `''`) → `{ tipo: 'entrada' }` sin cambios; implementar hasta verde.

## 4. Aplicación — permisos, estado, ventana y entrada

- [x] 4.1 Tests de permisos: `u-admin` reprograma ok; `u-odonto-1` sobre `T` de `prof-1` → `permiso` sin cambios; usuario `undefined` → `permiso`; `u-odonto-1` sobre `T` `atendido` → `permiso` (no `RN-AG-09`); implementar `ROLES_QUE_REPROGRAMAN` como primer chequeo hasta verde.
- [x] 4.2 Tests de estado (estados obtenidos con `cambiarEstadoTurno`/`cancelarTurno` reales): `confirmado` → aceptado y sigue `confirmado`; `cancelado` y `atendido` → `RN-AG-09` con `conflicto.turnoId` = `T`; `ausente` a `12:45` → `RN-AG-09` (no `RN-AG-04`); implementar con `esFinal` hasta verde.
- [x] 4.3 Tests de ventana con distintos `RelojFijo`: paciente a 25 h y a 24 h exactas → ok; a 23 h → `RN-AG-06`, `conflicto.turnoId` = `T`, mensaje de reprogramar, `T` sin cambios; recepción a 1 h → ok; paciente a 23 h hacia `12:45` → `RN-AG-06` (no `RN-AG-04`); implementar reutilizando `validarVentanaCancelacion` hasta verde.
- [x] 4.4 Tests de entrada y no encontrado: `inicio` `undefined` → `entrada`; mismo `inicio`/profesional/sillón → `entrada` sin auditoría; `turno-inexistente` → `no-encontrado`; implementar respetando el orden de design D2 hasta verde.

## 5. Aplicación — liberación, evento y auditoría

- [x] 5.1 Tests de liberación: tras reprogramar `T` a `11:00`, `crearTurno` para `pac-02` con `prof-1`/`sillon-1` a `10:00` → ok; reprogramar a `11:00` en `sillon-2` devuelve `turnoLiberado` con id de `T`, `prof-1`, `sillon-1`, `10:00`, `10:30`, y con un publicador en memoria se publica una vez; reprogramación rechazada por `RN-AG-06` no publica y el alta posterior a `10:00` falla con `RN-AG-02`; implementar hasta verde.
- [x] 5.2 Tests de auditoría (RN-AU-01): reprogramación aceptada registra un evento con `usuarioId` `u-recepcion`, `rol`, `accion` `reprogramar`, `entidad` `turno`, `entidadId`, `fecha` = reloj y `detalle` con `antes` (`10:00`, `sillon-1`) / `despues` (`11:00`, `sillon-2`); rechazo por `RN-AG-02` no registra; implementar y refactorizar (un único `ahora`, helpers privados) con todos los tests de la sección 2–5 verdes.
- [x] 5.3 Verificar pureza y tipos: `npm run typecheck` sin errores, sin `any`, y que `reprogramarTurno.ts` no importe Express ni llame a `new Date()`/`Date.now()` sin argumentos.

## 6. API — POST /api/turnos/:id/reprogramar (aditivo en turnos.ts)

- [x] 6.1 En `tests/api/reprogramar.test.ts` (supertest, `cargarSeed(RelojFijo)`), test rojo: recepción reprograma `T` a `2026-12-01T10:15:00-03:00` → `200` con `10:15`–`10:45` y mismo id; agregar al final de `turnosRouter` la ruta y `parsearReprogramacion` (design D6) hasta verde, sin modificar rutas existentes.
- [x] 6.2 Tests `409`: conflicto de sillón con `U` → `RN-AG-02`, `error.dimension` `sillon`, `error.conflicto.turnoId` de `U`; `12:45` → `RN-AG-04`; paciente con reloj `2026-11-30 11:00` → `RN-AG-06` con `conflicto.turnoId` de `T`; verificar hasta verde.
- [x] 6.3 Tests de reocupación y errores: tras reprogramar a `11:00`, `POST /api/turnos` para `pac-02` en `10:00` → `201`; `u-odonto-1` → `403` y `GET /api/turnos` muestra `T` en `10:00`; `inicio` sin zona → `400`; `turno-inexistente` → `404` con `error.tipo` `no-encontrado`; implementar hasta verde y refactorizar.

## 7. Verificación integral

- [x] 7.1 Correr `npm test` completo (C-01..C-04) en verde y `npm run typecheck` sin errores; confirmar que cada escenario de `specs/agenda-turnos/spec.md` de este change tiene al menos un test "dado … cuando … entonces …".
- [x] 7.2 Revisar `git diff --stat` y confirmar que fuera de los tres archivos nuevos solo cambió, de forma aditiva, `src/api/routes/turnos.ts` (rutas existentes intactas).

## Workflow follow-up

- Handoff en `knowledge-base/entrega/C-04.md`, PR con la plantilla hacia `master` (revisión del team lead; recordar que depende de C-03 sin mergear), luego `/opsx:archive`.
