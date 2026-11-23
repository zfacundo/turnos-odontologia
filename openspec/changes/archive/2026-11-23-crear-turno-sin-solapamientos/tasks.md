# Tasks

> TDD estricto: en cada tarea primero el test rojo (nombre "dado … cuando … entonces …"), luego el mínimo código verde, triangular y refactorizar. Sin mocks de dominio ni repositorios; solo `RelojFijo`. Fechas fijas con offset `-03:00`. Safety net antes de tocar archivos existentes: `npm test` en verde.

## 1. Dominio — tipo Turno y validación pura

- [x] 1.1 Safety net: correr `npm test` y registrar el baseline de tests verdes de C-01 antes de empezar.
- [x] 1.2 Crear `src/domain/agenda/turno.ts` con `EstadoTurno`, `OrigenTurno`, `Turno` y `TurnoExistente` (design D1/D3, sin imports de `src/application/`); verificar con `npx tsc --noEmit`.
- [x] 1.3 En `tests/domain/agenda/validarNuevoTurno.test.ts`, test rojo de fin calculado (control 30' a las 10:00 → fin 10:30) e inicio no alineado (10:10 → `RN-AG-03`, 10:15 aceptado); implementar `src/domain/agenda/validarNuevoTurno.ts` hasta verde.
- [x] 1.4 Tests de franja (RN-AG-04): cruza el corte de almuerzo (trat 12:30), termina justo 13:00 aceptado, sábado sin franja; implementar el helper de hora local (design D4) hasta verde.
- [x] 1.5 Tests de bloqueos (RN-AG-04): global de urgencias 18:30, bloqueo del profesional, bloqueo de otro sillón no afecta, turno contiguo a bloqueo aceptado; implementar hasta verde.
- [x] 1.6 Tests RN-AG-02: back-to-back aceptado, solapamiento parcial, contenido, mismo profesional distinto sillón (dimensión `profesional`, `conflicto.turnoId`), mismo sillón distinto profesional (dimensión `sillon`), otro profesional y otro sillón aceptado, conflicto doble informa `profesional`, primer conflicto = inicio más temprano; implementar hasta verde.
- [x] 1.7 Tests RN-AG-05 (paciente doble → dimensión `paciente`; paciente contiguo aceptado) y RN-AG-10 (cancelado en la lista no ocupa) y lista sin el turno excluido → éxito; implementar hasta verde y refactorizar con tests verdes. Verificar que `validarNuevoTurno.ts` no importe Express, `fs`, `src/application/` ni use `new Date()`/`Date.now()` sin argumentos.

## 2. Aplicación — caso de uso crearTurno

- [x] 2.1 Cambio aditivo en archivos compartidos (design D2): parámetro de tipo `T extends TurnoRegistro = TurnoRegistro` en `TurnoRepository` (`src/application/ports/repositorios.ts`) y `TurnoRepositoryEnMemoria` (`src/infrastructure/memory/turno-repository.ts`), y `Deps.turnos: TurnoRepository<Turno>` en `src/api/deps.ts`; verificar `npx tsc --noEmit` y que el baseline de 1.1 siga verde sin editar tests de C-01.
- [x] 2.2 En `tests/application/agenda/crearTurno.test.ts` (repos en memoria del seed + `RelojFijo`), test rojo de alta exitosa: turno guardado con `estado` `reservado`, `senado`/`esSobreturno` `false`, `origen` default `recepcion`, `creadoPor`, `creadoEn` = reloj y `fin` calculado; implementar `src/application/agenda/crearTurno.ts` hasta verde.
- [x] 2.3 Tests de permiso: `odontologo` y usuario ausente → `{ tipo: 'permiso' }` sin guardar; `admin` y `paciente` crean; implementar hasta verde.
- [x] 2.4 Tests de entidades inexistentes (paciente, prestación, profesional, sillón) → `{ tipo: 'entrada' }` con mensaje que nombra la entidad; implementar hasta verde.
- [x] 2.5 Tests de integración con repos reales: turno previo de otro profesional en el mismo sillón → `{ tipo: 'regla' }` `RN-AG-02` `sillon`; turno previo cancelado vía `actualizar` no bloquea (RN-AG-10); bloqueo global del seed → `RN-AG-04`; implementar hasta verde.
- [x] 2.6 Tests de auditoría (RN-AU-01): alta exitosa registra un evento con `usuarioId`, `rol`, `fecha` = reloj, `entidad` `turno`, `entidadId`; alta rechazada no registra; implementar y refactorizar con tests verdes.

## 3. API — rutas de turnos

- [x] 3.1 En `tests/api/turnos.test.ts` (supertest, `cargarSeed(RelojFijo)`), test rojo `POST /api/turnos` → `201` con el turno (campos del escenario "Alta exitosa vía API", fechas ISO UTC) y `origen: "whatsapp"`; implementar `src/api/routes/turnos.ts` y montarlo en `src/api/app.ts` antes del 404 de `/api` (una línea, aditivo) hasta verde.
- [x] 3.2 Tests `409`: conflicto por profesional con `error.regla` `RN-AG-02`, `error.dimension` `profesional`, `error.conflicto.turnoId` y sin guardar; `RN-AG-04` por trat a las 12:30; `RN-AG-03` por inicio 10:10; `RN-AG-05` paciente; implementar la traducción `ErrorCrearTurno` → `FalloDeRegla` hasta verde.
- [x] 3.3 Tests `400`: falta `inicio`, `inicio` sin zona, `origen` inválido, prestación inexistente; `fin` enviado se ignora (201 con fin calculado); implementar la validación de entrada (design D7) hasta verde.
- [x] 3.4 Tests `403`: odontólogo y request sin headers no crean (y `GET` posterior sin turnos); admin y paciente → `201`; implementar hasta verde.
- [x] 3.5 Tests `GET /api/turnos`: filtro por profesional + rango con turno contiguo excluido, filtro por sillón, sin filtros ordenado por inicio, rango incompleto o invertido → `400`; implementar hasta verde y refactorizar.

## 4. Verificación integral

- [x] 4.1 Correr `npm test` completo (C-01 + C-02) en verde, `npx tsc --noEmit` sin errores y confirmar que cada escenario de `specs/agenda-turnos/spec.md` tiene al menos un test "dado … cuando … entonces …".
- [x] 4.2 Revisar `git diff --stat` y confirmar que fuera de la Zona solo se tocaron, de forma aditiva, `src/api/app.ts`, `src/api/deps.ts`, `src/application/ports/repositorios.ts` y `src/infrastructure/memory/turno-repository.ts`.

## Workflow follow-up

- Handoff en `knowledge-base/entrega/C-02.md`, PR con la plantilla hacia `master` (revisión del team lead), luego `/opsx:archive`.
