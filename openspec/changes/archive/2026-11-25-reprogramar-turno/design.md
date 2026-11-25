## Context

C-02 y C-03 dejaron todas las piezas que este change compone (ver proposal.md - Impact):

- `validarNuevoTurno(candidato, { prestacion, profesional, bloqueos, turnos })` en `src/domain/agenda/validarNuevoTurno.ts`: puro, calcula `fin`, orden fijo alineación (RN-AG-01/03) → franja (RN-AG-04) → bloqueo (RN-AG-04) → profesional (RN-AG-02) → sillón (RN-AG-02) → paciente (RN-AG-05), ignora cancelados. **No conoce la idea de "excluir un turno"**: la exclusión tiene que hacerse filtrando la lista que recibe.
- `esFinal` (`estados.ts`) y `validarVentanaCancelacion` / `VENTANA_PACIENTE_MS` (`ventanaCancelacion.ts`), puros. El mensaje del error de ventana menciona "cancelar".
- `cambiarEstadoTurno.ts` exporta `buscarTurno(deps, id)` (→ `no-encontrado`), `ErrorCambioEstado` (`permiso | entrada | no-encontrado | regla`) y `DepsCambiarEstado`. Su `validarRol` usa un `Record<AccionTurno, …>` cerrado, así que no admite `reprogramar` sin editar ese archivo (fuera de la Zona).
- `cancelarTurno.ts` exporta `TurnoLiberado` y `PublicadorEventos`; `DepsCancelarTurno.eventos` es opcional y la API no lo provee.
- `src/api/routes/turnos.ts` tiene los helpers locales `resolverUsuario`, `responderErrorEstado` (`aErrorHttpEstado` → 403/400/409 por middleware, 404 directo), `esObjeto` y el regex `ISO_CON_ZONA` / `parsearFechaConZona` (este último **lanza** `ErrorDeEntrada`).
- `TurnoRepository.listarActivos({ rango })` excluye cancelados; `actualizar` devuelve `Result`. `Deps` de la API ya contiene todo lo que el caso de uso necesita (profesionales, sillones, prestaciones, bloqueos, turnos, clock, auditoria).

Restricción de Zona: solo se crea `src/application/agenda/reprogramarTurno.ts` y sus dos archivos de test; `src/api/routes/turnos.ts` se toca de forma aditiva.

## Goals / Non-Goals

**Goals:**
- Un único caso de uso `reprogramarTurno` reutilizable por la recepción y por el bot (C-06, RN-WA-02), que componga las funciones puras existentes sin duplicar reglas.
- Mismo orden de validación y forma de error que C-03 para que la API sea homogénea.

**Non-Goals:**
- Tocar `validarNuevoTurno`, `estados.ts`, `ventanaCancelacion.ts`, `cambiarEstadoTurno.ts` o `cancelarTurno.ts`.
- Atomicidad/concurrencia (repos en memoria, un solo proceso).
- Sobreturno al reprogramar (C-13 decidirá si aplica).

## Decisions

### D1. Firma del caso de uso
```ts
interface DepsReprogramarTurno extends DepsCambiarEstado {
  readonly profesionales: ProfesionalRepository;
  readonly sillones: SillonRepository;
  readonly prestaciones: PrestacionRepository;
  readonly bloqueos: BloqueoRepository;
  readonly eventos?: PublicadorEventos;
}
interface EntradaReprogramarTurno {
  readonly turnoId: string;
  readonly inicio: Date | undefined;      // undefined = ausente o inválido (lo decide la ruta, D6)
  readonly profesionalId?: string;
  readonly sillonId?: string;
}
reprogramarTurno(deps, usuario: Usuario | undefined, entrada)
  : Result<{ turno: Turno; evento: TurnoLiberado }, ErrorCambioEstado>
```
Reutiliza `ErrorCambioEstado` para que la ruta use `responderErrorEstado` tal cual. `Deps` de la API satisface `DepsReprogramarTurno` estructuralmente (sin `eventos`, igual que en C-03).
*Alternativa*: un `ErrorReprogramar` propio → descartado, obligaría a otra función de traducción HTTP idéntica.

### D2. Orden de validación (primer fallo gana)
1. Rol: `admin | recepcion | paciente`; otro o sin usuario → `permiso` (403). Lista local `ROLES_QUE_REPROGRAMAN` (no se reutiliza `validarRol` porque su `Record` cerrado no incluye `reprogramar`). El odontólogo se corta acá, así que no hace falta chequeo de propiedad.
2. Entrada: `inicio` ausente o `NaN` → `entrada`; `profesionalId`/`sillonId` presentes pero vacíos o inexistentes en su repositorio → `entrada` (mismo criterio que `crearTurno`).
3. Turno: `buscarTurno` → `no-encontrado` (404).
4. Estado: `esFinal(turno.estado)` → `regla` `{ regla: 'RN-AG-09', mensaje: 'No se puede reprogramar un turno <estado>.', conflicto: { turnoId } }`.
5. Ventana: `validarVentanaCancelacion(turno, rol, deps.clock.ahora())` sobre el inicio **actual**; si falla se devuelve el mismo `ErrorDeRegla` (`RN-AG-06`, `conflicto` = propio turno) con `mensaje` reemplazado por "Solo se puede reprogramar con 24 horas o más de anticipación.".
6. Sin cambios: mismo `inicio` (por `getTime()`), profesional y sillón que el turno → `entrada` "El nuevo horario es igual al actual." Va después de estado/ventana para que un turno final o fuera de ventana reporte su regla.
7. Agenda: `validarNuevoTurno` (D3) → `regla` con el error de dominio sin tocar (`RN-AG-01..05`, `dimension`, `conflicto`).

*Por qué RN-AG-09 → RN-AG-06 → agenda*: coherente con C-03 (estado antes que ventana) y con RN-AG-08 (la ventana es una precondición de la operación, no del horario nuevo). El código de la ventana se mantiene `RN-AG-06` porque es la regla que define la ventana; RN-AG-08 solo la remite.

### D3. Exclusión del propio turno
```ts
const profesionalId = entrada.profesionalId ?? turno.profesionalId; // ídem sillón
const rango = { inicio, fin: inicio + prestacion.duracionMin };
validarNuevoTurno(
  { pacienteId: turno.pacienteId, prestacionId: turno.prestacionId, profesionalId, sillonId, inicio },
  { prestacion, profesional, bloqueos: deps.bloqueos.listarEn(rango),
    turnos: deps.turnos.listarActivos({ rango }).filter((t) => t.id !== turno.id) },
);
```
La prestación se busca por `turno.prestacionId`; si faltara (dato inconsistente) → `entrada`. El profesional resuelto ya se validó en D2 paso 2 (o es el del turno).
*Alternativa*: agregar `excluirTurnoId` a `ContextoValidacion` → descartado: es un cambio en `validarNuevoTurno`, fuera de alcance; el filtro logra lo mismo y mantiene el dominio intacto.

### D4. Persistencia, auditoría y evento
`actualizado = { ...turno, profesionalId, sillonId, inicio: intervalo.inicio, fin: intervalo.fin, actualizadoEn: ahora }` (estado, paciente, prestación, origen, `creadoPor`, `creadoEn`, `senado`, `esSobreturno` se conservan). `deps.turnos.actualizar(actualizado)`; si devuelve error → `regla` con ese error. Luego `deps.auditoria.registrar({ accion: 'reprogramar', entidad: 'turno', entidadId, fecha: ahora, usuarioId, rol, detalle: JSON.stringify({ antes: turno, despues }) })`. Evento `TurnoLiberado` (tipo importado de `cancelarTurno.ts`) con `turnoId`, el profesional, sillón, inicio y fin **anteriores** y `fecha: ahora`; se publica si hay `deps.eventos` y se devuelve en el resultado. Se toma un único `ahora` del reloj para ventana, `actualizadoEn`, auditoría y evento.
Cuando el nuevo horario se solapa con el anterior (correr 15'), el evento igual informa el intervalo anterior completo: el consumidor (C-14) calculará huecos reales con el motor de C-05; no se intenta restar intervalos aquí.

### D5. No reutilizar `aplicarTransicion`
`aplicarTransicion` de C-03 exige una transición de estado y audita con `AccionTurno`; reprogramar no cambia de estado. Se escribe la secuencia persistir → auditar → evento en el propio archivo (unas 15 líneas).
*Alternativa*: generalizar `aplicarTransicion` → edita `cambiarEstadoTurno.ts`, fuera de la Zona.

### D6. Ruta aditiva
Al final de `turnosRouter`, antes de `return router`:
```ts
router.post('/turnos/:id/reprogramar', (req, res, next) => {
  const usuario = resolverUsuario(deps, res.locals.usuario as Usuario | undefined);
  const resultado = reprogramarTurno(deps, usuario, parsearReprogramacion(req.params.id, req.body));
  if (!resultado.ok) { responderErrorEstado(resultado.error, res, next); return; }
  res.status(200).json(resultado.valor.turno);
});
```
`parsearReprogramacion` (función local nueva) **no lanza**, para respetar "rol antes que entrada" (igual que el `motivo` de cancelar): si el cuerpo no es objeto o `inicio` no es string que cumpla `ISO_CON_ZONA` o da fecha inválida → `inicio: undefined`; `profesionalId`/`sillonId` ausentes → `undefined`, string → tal cual, otro tipo → `''` (el caso de uso lo rechaza como entrada). No se modifica `parsearFechaConZona` (lanza) ni ninguna ruta existente. Respuesta exitosa `200` con el turno; el evento no se expone.

### D7. Tests
Aplicación (`tests/application/agenda/reprogramarTurno.test.ts`): `cargarSeed(new RelojFijo(...))` con `AHORA = 2026-11-30T09:00:00-03:00` como en C-03, `T`, `U`, `V` creados con `crearTurno` real; estados finales con `cambiarEstadoTurno` / `cancelarTurno` reales; distintos relojes rearmando `deps` con `{ ...base, clock: new RelojFijo(x) }` (patrón de `cancelarTurno.test.ts`); publicador en memoria definido en el test (no es mock de dominio ni de repo). API (`tests/api/reprogramar.test.ts`): supertest sobre la app con seed, archivo nuevo para no editar tests de C-02/C-03. Nombres "dado … cuando … entonces …".

## Risks / Trade-offs

- [Paciente puede reprogramar turnos de otros pacientes] → No hay vínculo usuario→paciente (igual que C-02/C-03); lo resuelve el bot (C-06) o un cambio de `rolSimulado` del team lead.
- [Error de ventana con mensaje reescrito en la aplicación] → El código de regla y el conflicto no cambian; si el team lead prefiere, `validarVentanaCancelacion` podría aceptar la acción para el mensaje (cambio fuera de la Zona).
- [`turnoLiberado` informa el intervalo anterior completo aunque se solape con el nuevo] → Documentado en D4; C-14 debe recalcular huecos antes de ofrecerlos.
- [`listarActivos` incluye `atendido`/`ausente`] → Mismo comportamiento que el alta de C-02 (RN-AG-10 solo libera cancelados); no se cambia acá.
- [Reprogramar al pasado] → El alta de C-02 tampoco lo impide; se mantiene la paridad (ver Open Questions).

## Migration Plan

Sin migración: persistencia en memoria. Rollback = revertir el PR; la ruta es aditiva y no cambia el contrato de los endpoints existentes.

## Open Questions

- ¿Un turno `confirmado` que se reprograma debería volver a `reservado` (el paciente no confirmó el horario nuevo)? Hoy se conserva el estado; cambiarlo sería una edición menor del spec.
- ¿El paciente puede reprogramar hacia un horario a menos de 24 h o en el pasado? Hoy solo se controla la anticipación del horario actual (pregunta Media de `10_preguntas_abiertas.md`: "misma ventana que cancelar").
- ¿Mover `TurnoLiberado`/`PublicadorEventos` a `src/application/ports/` y agregar `eventos` a `Deps`? Corresponde a C-14 (fuera de la Zona).
- ¿Agregar `'reprogramar'` a la matriz `ROLES_PERMITIDOS` de `cambiarEstadoTurno.ts` para centralizar el RBAC? Fuera de la Zona; decisión del team lead.
