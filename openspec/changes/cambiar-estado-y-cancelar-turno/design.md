## Context

C-02 dejó: `Turno` completo en `src/domain/agenda/turno.ts` (ya incluye `actualizadoEn`, `motivoCancelacion`, `canceladoPor`), `TurnoRepository<Turno>` con `buscarPorId` y `actualizar` (devuelve `Result`), `listarActivos` que ya excluye cancelados (RN-AG-10), el `Result`/`ErrorDeRegla` de `src/domain/shared/result.ts`, el puerto `Auditoria` de solo inserción, el `Clock` inyectado (`RelojFijo` en tests) y el patrón de caso de uso de `crearTurno` (`deps`, `usuario`, `entrada` → `Result<Turno, ErrorCrearTurno>` con `tipo: 'permiso' | 'entrada' | 'regla'`), que la ruta traduce a `403 / 400 / 409` con los errores del middleware.

Restricciones que moldean el diseño: Zona acotada (ver proposal - Impact); `src/api/routes/turnos.ts` solo se toca de forma aditiva; el middleware `rolSimulado` arma el `Usuario` **sin** `profesionalId` (solo `id` y `rol` de los headers), aunque `deps.usuarios` del seed sí lo tiene; no existe ningún bus de eventos.

## Goals / Non-Goals

**Goals:**
- Reglas RN-AG-09 y RN-AG-06 como funciones puras testeables sin repositorios.
- Un solo camino de aplicación para las cuatro acciones, reutilizable por el bot (C-06, RN-WA-02) y por reprogramar (C-04 reutiliza la ventana de cancelación, RN-AG-08).
- Endpoints con la misma forma de error que C-02 (DD-08).

**Non-Goals:**
- Bus de eventos o suscriptores reales de `turnoLiberado` (C-14).
- Verificar que el turno sea "propio" del paciente (no hay vínculo usuario→paciente; mismo criterio que C-02).
- Restricciones temporales para atender/ausente (p. ej. no marcar atendido antes del inicio) y pase automático a ausente.

## Decisions

### D1. `estados.ts`: tabla de transiciones + función pura
`TRANSICIONES: Readonly<Record<EstadoTurno, readonly EstadoTurno[]>>` y `validarTransicion(turno: Pick<Turno,'id'|'estado'>, destino: EstadoTurno): Result<EstadoTurno, ErrorDeRegla>`. El error es `{ regla: 'RN-AG-09', mensaje, conflicto: { turnoId } }` (DD-08: el "turno en conflicto" es el propio). La misma transición a su estado actual también falla (no está en la tabla). También exporta `esFinal(estado)`.
*Alternativa*: un `switch` por acción en la aplicación → descartado: duplica la regla y no es testeable en aislamiento.

### D2. `ventanaCancelacion.ts`: función pura con `ahora` como argumento
`validarVentanaCancelacion(turno: Pick<Turno,'id'|'inicio'>, rol: Rol, ahora: Date): Result<true, ErrorDeRegla>`. `recepcion` y `admin` → siempre ok; `paciente` → ok si `inicio - ahora >= 24 h` (exactamente 24 h es válido: "hasta 24 h antes"); si no, `{ regla: 'RN-AG-06', conflicto: { turnoId } }`. Para `odontologo` no se llega acá (permiso se corta antes, D4); por robustez devuelve el mismo `RN-AG-06`. El dominio no recibe el `Clock`: la aplicación llama `deps.clock.ahora()` y pasa la fecha (dominio puro, regla dura 5). Exporta la constante `VENTANA_PACIENTE_MS` para que C-04 la reutilice.

### D3. Dos casos de uso, un núcleo compartido
- `cambiarEstadoTurno(deps, usuario, { turnoId, accion })` con `accion: 'confirmar' | 'atender' | 'ausente'` → `Result<Turno, ErrorCambioEstado>`.
- `cancelarTurno(deps, usuario, { turnoId, motivo })` → `Result<{ turno: Turno; evento: TurnoLiberado }, ErrorCambioEstado>`.

`ErrorCambioEstado = { tipo: 'permiso' | 'entrada' | 'no-encontrado', mensaje } | { tipo: 'regla', error: ErrorDeRegla }` (extiende el patrón de `ErrorCrearTurno` con `no-encontrado`). Orden de validación, primer fallo gana: usuario/rol (403) → motivo vacío (400, solo cancelar) → turno inexistente (404) → propiedad del odontólogo (403, necesita el turno) → transición RN-AG-09 (409) → ventana RN-AG-06 (409, solo cancelar). Luego `deps.turnos.actualizar({...turno, estado, actualizadoEn: ahora, [motivoCancelacion, canceladoPor]})` y `deps.auditoria.registrar({ accion, entidad: 'turno', entidadId, fecha: ahora, usuarioId, rol, detalle: JSON.stringify({ antes, despues }) })`.
`cambiarEstadoTurno.ts` exporta el helper interno de "aplicar transición + persistir + auditar" y `cancelarTurno.ts` lo reutiliza, así la lógica no se duplica.
*Por qué RN-AG-09 antes que RN-AG-06*: cancelar un turno `atendido` debe decir "estado final", no "fuera de ventana".

### D4. Permisos y odontólogo "propio"
Matriz en `cambiarEstadoTurno.ts`: `confirmar` → admin/recepcion/paciente; `cancelar` → admin/recepcion/paciente; `atender`/`ausente` → admin/recepcion/odontologo con `usuario.profesionalId === turno.profesionalId`. Como `rolSimulado` no carga `profesionalId`, la **ruta** (zona aditiva) resuelve el usuario completo: si `deps.usuarios` tiene uno con el mismo `id` y `rol`, usa ese; si no, el de los headers. Un odontólogo sin `profesionalId` resuelto no puede atender ningún turno (403).
*Alternativa*: cambiar `rolSimulado` para que lea `deps.usuarios` → descartado: fuera de la Zona (`src/api/middleware/`); queda como sugerencia al team lead.

### D5. Evento `turnoLiberado` sin bus
`cancelarTurno.ts` declara `interface TurnoLiberado { tipo: 'turnoLiberado'; turnoId; profesionalId; sillonId; inicio; fin; fecha }` y `interface PublicadorEventos { publicar(e: TurnoLiberado): void }`. `DepsCancelarTurno` incluye `eventos?: PublicadorEventos` (opcional; la API actual no lo provee porque `deps.ts` está fuera de la Zona). El caso de uso **devuelve** el evento en el resultado y, si hay publicador, lo publica. Los tests verifican el evento devuelto y, con un publicador real en memoria definido en el test (no es un mock de dominio ni de repositorio), que se publicó una sola vez. C-14 conecta el publicador en `deps`.
*Alternativa*: crear `src/application/ports/eventos.ts` → fuera de la Zona; se puede mover allí cuando C-14 lo necesite.

### D6. Rutas aditivas en `turnos.ts`
Cuatro `router.post('/turnos/:id/<accion>')` agregados al final de `turnosRouter`, antes del `return router`, más una función `aErrorHttpEstado` local que traduce `ErrorCambioEstado`: `permiso` → `ErrorDePermiso` (403), `entrada` → `ErrorDeEntrada` (400), `regla` → `FalloDeRegla` (409 con `regla` y `conflicto.turnoId`), `no-encontrado` → respuesta directa `404 { error: { tipo: 'no-encontrado', mensaje } }` (misma forma que el 404 de `/api` en `app.ts`; el middleware no tiene clase para 404 y está fuera de la Zona). `cancelar` valida que el cuerpo sea objeto con `motivo` texto no vacío (con `trim`) antes de llamar al caso de uso. La respuesta exitosa es `200` con el turno (el evento no se expone en la API). La ruta de alta y la de consulta no se modifican.

### D7. Tests
Dominio: tablas parametrizadas (`it.each`) sobre las 5×5 combinaciones de estado y sobre bordes de la ventana (25 h, 24 h exactas, 23 h 59 min, turno pasado). Aplicación: repos en memoria del seed vía `cargarSeed(new RelojFijo(...))` y `AuditoriaEnMemoria.eventos()`; el turno `T` se crea con `crearTurno` real; los estados finales previos se obtienen con los propios casos de uso (no escribiendo el repo a mano, salvo `actualizar` cuando haga falta un estado inalcanzable). API: archivo nuevo `tests/api/estadosTurno.test.ts` con supertest, para no editar el `tests/api/turnos.test.ts` de C-02.

## Risks / Trade-offs

- [Paciente puede cancelar/confirmar turnos de otros] → No hay vínculo usuario→paciente (igual que en C-02); se documenta y se resuelve con el bot (C-06).
- [`turnoLiberado` sin consumidores en la API real] → Es explícitamente lo pedido (C-14 stretch); el evento queda testeado a nivel aplicación.
- [Respuesta 404 armada en la ruta, no en el middleware] → Misma forma JSON que el 404 existente; si el team lead agrega una clase `ErrorNoEncontrado` al middleware, se migra sin cambiar el contrato.
- [Odontólogo resuelto por `deps.usuarios` en la ruta] → Si `rolSimulado` empieza a cargar `profesionalId`, la resolución en la ruta se vuelve redundante pero inofensiva.
- [Sin restricción temporal para atender/ausente] → Se puede marcar atendido un turno futuro; queda como pregunta abierta, no rompe ningún criterio de aceptación.

## Migration Plan

Sin migración: persistencia en memoria. Rollback = revertir el PR; las rutas son aditivas y no cambian el contrato de `POST /api/turnos` ni de `GET /api/turnos`.

## Open Questions

- ¿Debe `rolSimulado` cargar `profesionalId` (y un futuro `pacienteId`) desde `deps.usuarios`? Simplificaría D4; es cambio fuera de la Zona, a decidir por el team lead.
- ¿Se puede marcar `atendido`/`ausente` antes del inicio del turno? ¿Pase automático a `ausente`? (pregunta Media de `10_preguntas_abiertas.md`). Hoy: manual y sin restricción temporal.
- ¿Mover `PublicadorEventos`/`TurnoLiberado` a `src/application/ports/` y agregar `eventos` a `Deps`? Corresponde a C-14.
- ¿Ampliar el `Purpose` del spec principal `agenda-turnos` (hoy solo habla de crear y consultar) para incluir el ciclo de vida? Edición directa del spec principal, sugerida para el archive.
