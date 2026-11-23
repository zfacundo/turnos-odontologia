# Tasks

> TDD estricto: en cada tarea primero el test rojo (nombre "dado … cuando … entonces …"), luego el mínimo código verde, triangular y refactorizar. Sin mocks de dominio ni repositorios; solo `RelojFijo`. Fechas fijas con offset `-03:00`. Solo se tocan archivos de la Zona; `src/api/routes/turnos.ts` solo de forma aditiva.

## 1. Dominio — máquina de estados y ventana de cancelación

- [x] 1.1 Safety net: correr `npm test` y `npm run typecheck`, registrar el baseline de tests verdes de C-01 + C-02; si algo falla, detenerse y reportarlo como falla preexistente.
- [x] 1.2 En `tests/domain/agenda/estados.test.ts`, test rojo: `reservado → confirmado` ok y `atendido → cancelado` → `RN-AG-09` con `conflicto.turnoId`; crear `src/domain/agenda/estados.ts` (design D1) hasta verde.
- [x] 1.3 Triangular con `it.each` sobre las 25 combinaciones origen×destino (válidas según RN-AG-09; finales y mismo estado rechazados) y `esFinal`; generalizar la tabla hasta verde y refactorizar. Verificar que el archivo no importe Express, `fs`, `src/application/` ni use `new Date()`/`Date.now()` sin argumentos.
- [x] 1.4 En `tests/domain/agenda/ventanaCancelacion.test.ts`, test rojo: paciente a 25 h ok y a 23 h → `RN-AG-06` con `conflicto.turnoId`; crear `src/domain/agenda/ventanaCancelacion.ts` (design D2) hasta verde.
- [x] 1.5 Triangular: paciente a exactamente 24 h ok, a 23 h 59 min y con turno ya iniciado → `RN-AG-06`; recepción a 1 h y admin con turno iniciado → ok; exportar `VENTANA_PACIENTE_MS`; refactorizar con tests verdes y verificar pureza como en 1.3.

## 2. Aplicación — cambiarEstadoTurno y cancelarTurno

- [x] 2.1 En `tests/application/agenda/cambiarEstadoTurno.test.ts` (seed + `RelojFijo` + `crearTurno` real para `T`), test rojo: recepción confirma `T` → `confirmado` con `actualizadoEn` = reloj y persistido (`buscarPorId`); crear `src/application/agenda/cambiarEstadoTurno.ts` (design D3) hasta verde.
- [x] 2.2 Triangular transiciones: confirmado → atendido, reservado → ausente, ausente → atendido y confirmar dos veces → `{ tipo: 'regla' }` `RN-AG-09` sin modificar el turno; turno inexistente → `{ tipo: 'no-encontrado' }`; implementar hasta verde.
- [x] 2.3 Tests de permisos (design D4): odontólogo no confirma; `u-odonto-1` (con `profesionalId` `prof-1`) atiende `T` de `prof-1`; `u-odonto-2` no marca ausente `T` → `permiso` sin cambios; paciente confirma pero no atiende; usuario ausente → `permiso`; implementar la matriz hasta verde.
- [x] 2.4 Tests de auditoría (RN-AU-01): confirmar registra un evento con `accion` `confirmar`, `usuarioId`, `rol`, `fecha` = reloj, `entidad` `turno`, `entidadId` y `detalle` con `antes.estado` `reservado` / `despues.estado` `confirmado`; operación rechazada no registra; implementar y refactorizar (extraer el helper compartido de D3) con tests verdes.
- [x] 2.5 En `tests/application/agenda/cancelarTurno.test.ts`, test rojo: `u-recepcion` cancela `T` con motivo "Paciente avisó por teléfono" → estado `cancelado`, `motivoCancelacion`, `canceladoPor` `u-recepcion`, `actualizadoEn` = reloj; crear `src/application/agenda/cancelarTurno.ts` reutilizando el helper de 2.4 hasta verde.
- [x] 2.6 Tests de ventana (RN-AG-06) con distintos `RelojFijo`: paciente a 25 h y a 24 h exactas ok, a 23 h → `RN-AG-06` sin cambios; recepción a 1 h y admin con turno iniciado ok; `atendido` → `RN-AG-09` (no `RN-AG-06`); implementar hasta verde.
- [x] 2.7 Tests de entrada y permiso: motivo ausente o vacío/espacios → `{ tipo: 'entrada' }`; `u-odonto-1` cancela → `permiso` (también con `T` atendido: permiso antes que estado); implementar hasta verde.
- [x] 2.8 Tests de liberación y evento (design D5): tras cancelar, `crearTurno` para `pac-02` con `prof-1`/`sillon-1` a las 10:00 → ok; el resultado trae `turnoLiberado` con id, `prof-1`, `sillon-1`, inicio y fin; con un publicador en memoria definido en el test se publica una vez; cancelación rechazada no publica y el alta posterior falla con `RN-AG-02`; auditoría de cancelación con `accion` `cancelar` y antes/después; implementar y refactorizar con tests verdes.

## 3. API — rutas de cambio de estado (aditivo en turnos.ts)

- [x] 3.1 En `tests/api/estadosTurno.test.ts` (supertest, `cargarSeed(RelojFijo)`), test rojo: recepción `POST /api/turnos/:id/confirmar` → `200` con estado `confirmado`; agregar al final de `turnosRouter` las rutas `confirmar`, `atender`, `ausente` y la resolución de usuario contra `deps.usuarios` (design D4/D6) hasta verde, sin modificar las rutas existentes.
- [x] 3.2 Tests `409`: cancelar `T` atendido → `RN-AG-09` con `error.conflicto.turnoId`; paciente con reloj en `2026-11-30 11:00` cancela → `RN-AG-06`; agregar la ruta `cancelar` y la traducción `aErrorHttpEstado` hasta verde.
- [x] 3.3 Tests `200`/`201` de cancelar y reocupar: cancelación devuelve `cancelado`, `motivoCancelacion` y `canceladoPor` `u-recepcion`, y el `POST /api/turnos` posterior para `pac-02` en el mismo horario/profesional/sillón → `201`; `u-odonto-1` atiende su turno → `200`; implementar hasta verde.
- [x] 3.4 Tests de error: `u-odonto-1` cancela → `403` y `GET /api/turnos` muestra `T` `reservado`; cancelar con cuerpo `{}` → `400`; `POST /api/turnos/turno-inexistente/confirmar` → `404` con `error.tipo` `no-encontrado`; implementar hasta verde y refactorizar.

## 4. Verificación integral

- [x] 4.1 Correr `npm test` completo (C-01 + C-02 + C-03) en verde y `npm run typecheck` sin errores; confirmar que cada escenario de `specs/agenda-turnos/spec.md` de este change tiene al menos un test "dado … cuando … entonces …".
- [x] 4.2 Revisar `git diff --stat` y confirmar que fuera de los archivos nuevos solo cambió, de forma aditiva, `src/api/routes/turnos.ts` (rutas de alta y consulta intactas).

## Workflow follow-up

- Handoff en `knowledge-base/entrega/C-03.md`, PR con la plantilla hacia `master` (revisión del team lead), luego `/opsx:archive`.
