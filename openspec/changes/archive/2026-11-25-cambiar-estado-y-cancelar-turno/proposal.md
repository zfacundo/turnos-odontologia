## Why

Con C-02 los turnos se crean en estado `reservado` pero no pueden avanzar: no hay forma de confirmarlos, marcarlos atendidos o ausentes, ni de cancelarlos y liberar el horario. C-03 está en el camino crítico (C-04 reprogramar y C-06 bot dependen de él) y cubre RN-AG-06 (cancelación con ventana de 24 h para el paciente) y RN-AG-09 (máquina de estados) para la entrega del 2026-11-24.

## What Changes

- Máquina de estados pura del turno (RN-AG-09): `reservado → confirmado | cancelado | ausente | atendido`; `confirmado → cancelado | atendido | ausente`; `cancelado`, `atendido` y `ausente` son finales. Una transición inválida responde `409` con la regla `RN-AG-09` y el turno en conflicto (DD-08).
- Ventana de cancelación pura (RN-AG-06): el paciente cancela solo si faltan **24 h o más** para el inicio; recepción y administración cancelan siempre. La hora llega por el `Clock` inyectado.
- Casos de uso de aplicación para confirmar, atender, marcar ausente y cancelar: validan permisos por rol (RBAC de `03_actores_y_roles.md`), persisten el turno actualizado, registran un evento de auditoría inmutable con antes/después (RN-AU-01) y, al cancelar, guardan motivo y autor y emiten el evento interno `turnoLiberado` (para C-14; nadie lo consume todavía).
- Un turno cancelado deja de ocupar profesional, sillón y paciente: un turno nuevo en el mismo horario se acepta (RN-AG-10, ya garantizado por C-02; C-03 lo verifica de punta a punta).
- Nuevas rutas, agregadas al final de `src/api/routes/turnos.ts` (aditivo): `POST /api/turnos/:id/confirmar`, `/atender`, `/ausente`, `/cancelar` (esta última con `motivo` obligatorio). `404` si el turno no existe, `403` si el rol no puede, `400` si falta el motivo.
- Permisos: odontólogo **no** confirma ni cancela (`403`) y solo marca atendido/ausente en turnos de su propio profesional; paciente confirma y cancela (dentro de la ventana) pero no marca atendido/ausente.

**Fuera de alcance**: notificar a la lista de espera (C-14; solo se emite el evento), reprogramar (C-04), UI, pase automático a `ausente` de turnos vencidos (pregunta abierta Media; aquí el cambio es manual), verificación de que el turno sea "propio" del paciente (no hay vínculo usuario→paciente; ver design).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `agenda-turnos`: se agregan requisitos de ciclo de vida del turno (transiciones de estado RN-AG-09, cancelación con ventana de 24 h RN-AG-06, liberación del horario, permisos por rol para cambiar estado, auditoría de cambios de estado y cancelación, y los endpoints `POST /api/turnos/:id/{confirmar|atender|ausente|cancelar}`). Los requisitos existentes de alta y consulta no cambian.

## Impact

- **Código nuevo (Zona)**: `src/domain/agenda/estados.ts`, `src/domain/agenda/ventanaCancelacion.ts`, `src/application/agenda/cambiarEstadoTurno.ts`, `src/application/agenda/cancelarTurno.ts`.
- **Compartido, solo aditivo**: `src/api/routes/turnos.ts` (rutas nuevas al final del router; la ruta de alta y la de consulta no se tocan).
- **Tests nuevos**: `tests/domain/agenda/estados.test.ts`, `tests/domain/agenda/ventanaCancelacion.test.ts`, `tests/application/agenda/cancelarTurno.test.ts`, `tests/application/agenda/cambiarEstadoTurno.test.ts` y `tests/api/estadosTurno.test.ts` (archivos nuevos; no se edita `tests/api/turnos.test.ts` de C-02).
- **Sin cambios** en `Turno` (ya tiene `actualizadoEn`, `motivoCancelacion`, `canceladoPor`), en los puertos, en el repositorio en memoria (`actualizar` ya existe), en el middleware ni en `deps.ts`.
- **API**: 4 endpoints nuevos; respuestas `200` (turno actualizado), `400`, `403`, `404`, `409`.
- **Dependencias**: ninguna nueva.
