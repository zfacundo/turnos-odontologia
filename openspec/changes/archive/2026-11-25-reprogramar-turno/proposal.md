## Why

Con C-02 y C-03 un turno se crea, cambia de estado y se cancela, pero no se puede mover a otro horario: hoy la recepción tendría que cancelar y crear uno nuevo, perdiendo la trazabilidad y el estado. C-04 está en el camino crítico (C-06 bot de WhatsApp reprograma con los mismos casos de uso, RN-WA-02) y cubre RN-AG-08 ("reprogramar = revalidar") para la entrega del 2026-11-24 (US-012, Flujo 3).

## What Changes

- Caso de uso `reprogramarTurno`: mueve un turno `reservado` o `confirmado` a un nuevo `inicio` y, opcionalmente, a otro profesional y/o sillón. Conserva id, paciente, prestación y estado; recalcula `fin` con la duración de la prestación.
- Revalidación completa con `validarNuevoTurno` de C-02 (RN-AG-01..05: alineación a 15', franja del profesional, bloqueos, solapamiento por profesional, por sillón y por paciente) pasando los turnos activos **sin el propio turno**: correr un turno 15' hacia adelante solapando consigo mismo se acepta.
- Ventana de 24 h del paciente reutilizando `validarVentanaCancelacion` / `VENTANA_PACIENTE_MS` de C-03 (RN-AG-08 → RN-AG-06), medida sobre el horario **actual** del turno; recepción y administración reprograman sin restricción de anticipación.
- Estados finales (`cancelado`, `atendido`, `ausente`) no se reprograman → `409` `RN-AG-09` con el propio turno como conflicto.
- Permisos (RBAC de `03_actores_y_roles.md`): reprograman `admin`, `recepcion` y `paciente`; `odontologo` → `403`.
- El horario anterior queda libre: un turno nuevo en ese horario se acepta y se emite el evento interno `turnoLiberado` (mismo tipo de C-03) con el profesional, sillón, inicio y fin anteriores (para C-14; nadie lo consume todavía).
- Auditoría inmutable con acción `reprogramar` y detalle antes/después (RN-AU-01).
- Nueva ruta, agregada al final de `src/api/routes/turnos.ts` (aditivo): `POST /api/turnos/:id/reprogramar` con cuerpo `{ inicio, profesionalId?, sillonId? }`; `200` con el turno actualizado, `400` entrada inválida, `403` permiso, `404` turno inexistente, `409` con la regla (`RN-AG-02`, `RN-AG-03`, `RN-AG-04`, `RN-AG-05`, `RN-AG-06`, `RN-AG-09`) y el turno en conflicto (DD-08).

**Fuera de alcance**: cambios en `validarNuevoTurno` (si hicieran falta, PR al team lead), notificar a la lista de espera (C-14; solo se emite el evento), cambiar la prestación o el paciente del turno, sobreturno al reprogramar (C-13), UI, verificación de que el turno sea "propio" del paciente (no hay vínculo usuario→paciente; mismo criterio que C-02/C-03).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `agenda-turnos`: se agregan requisitos de reprogramación (revalidación excluyendo el propio turno, cambio opcional de profesional/sillón, estados reprogramables, ventana de 24 h del paciente, permisos, liberación del horario anterior, datos conservados/actualizados, auditoría y el endpoint `POST /api/turnos/:id/reprogramar`). Los requisitos existentes de alta, consulta y los agregados por C-03 no cambian.

## Impact

- **Código nuevo (Zona)**: `src/application/agenda/reprogramarTurno.ts`.
- **Compartido, solo aditivo**: `src/api/routes/turnos.ts` (una ruta nueva al final del router, reutilizando `resolverUsuario` y `responderErrorEstado` de C-03; las rutas existentes no se tocan).
- **Reutilizado sin modificar**: `validarNuevoTurno` (C-02), `esFinal` y `validarVentanaCancelacion` (C-03), `buscarTurno` y `ErrorCambioEstado` de `cambiarEstadoTurno.ts`, `TurnoLiberado` / `PublicadorEventos` de `cancelarTurno.ts`.
- **Tests nuevos**: `tests/application/agenda/reprogramarTurno.test.ts`, `tests/api/reprogramar.test.ts`.
- **Sin cambios** en el dominio, `Turno`, puertos, repositorios en memoria, middleware ni `deps.ts`.
- **API**: 1 endpoint nuevo. **Dependencias**: ninguna nueva.
