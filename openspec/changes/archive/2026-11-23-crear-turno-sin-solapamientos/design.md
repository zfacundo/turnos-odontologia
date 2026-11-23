# Design

## Context

Ver proposal.md (Why). Estado heredado de C-01 que condiciona el diseño:

- `src/domain/shared/`: `Intervalo` + `seSolapan` (semiabierto), `crearIntervaloAlineado` (RN-AG-01/03), `estaAlineadoA15`, `Result`/`ErrorDeRegla { regla, mensaje, dimension?, conflicto?: { turnoId } }`, `Rol`/`Usuario`.
- `Profesional.disponibilidad: Franja[]` con `diaSemana` ISO (1 = lunes) y `desde`/`hasta` `'HH:mm'` en hora del consultorio. `Bloqueo { intervalo, profesionalId?, sillonId? }` (sin ambos = global).
- Puerto `TurnoRepository` tipado con el mínimo `TurnoRegistro` (C-01 design D4); `listarActivos(filtro)` ya excluye cancelados y filtra por `profesionalId`/`sillonId`/`pacienteId`/`rango` con semántica de solapamiento. `BloqueoRepository.listarEn(rango)`.
- `errores.ts` ya mapea `FalloDeRegla` → 409 `{ error: { tipo: 'regla', regla, mensaje, dimension?, conflicto? } }`, `ErrorDeEntrada` → 400, `ErrorDePermiso` → 403. `rolSimulado` deja `res.locals.usuario: Usuario | undefined` (sin `profesionalId`).
- La zona horaria es UTC-03:00 fija (sin DST); `cargar-seed.ts` ya usa ese offset.

## Goals / Non-Goals

**Goals:**
- Validación de alta 100 % pura y reutilizable por C-04 (reprogramar) y C-13 (sobreturno) sin modificarla.
- Reutilizar el mapeo de errores existente sin tocar `errores.ts` ni `result.ts`.
- Cambios en archivos compartidos mínimos y estrictamente aditivos.

**Non-Goals:**
- Sobreturno (el payload no interpreta `sobreturno`; C-13), cambios de estado, cancelar, reprogramar, huecos libres, UI.
- Validar que el inicio sea futuro, que profesional/sillón estén `activo`, o que un paciente solo cree turnos propios (ver Open Questions).

## Decisions

### D1. `Turno` completo en `src/domain/agenda/turno.ts`
```ts
type EstadoTurno = 'reservado' | 'confirmado' | 'cancelado' | 'atendido' | 'ausente';
type OrigenTurno = 'recepcion' | 'whatsapp' | 'telefono';
interface Turno { id; pacienteId; prestacionId; profesionalId; sillonId; inicio: Date; fin: Date;
  estado: EstadoTurno; senado: boolean; esSobreturno: boolean; origen: OrigenTurno;
  creadoPor: string; creadoEn: Date; actualizadoEn?: Date; motivoCancelacion?: string; canceladoPor?: string }
```
Incluye los opcionales del modelo (04 §Turno) para que C-03 no edite el tipo. El dominio NO importa de `src/application/` (dependencias hacia adentro): `EstadoTurno` se declara en el dominio con la misma unión que `EstadoTurnoRegistro`, y `Turno` cumple estructuralmente `TurnoRegistro`.

### D2. Puerto genérico con default (aditivo)
Problema: el repo devuelve `TurnoRegistro`, sin `prestacionId`, `origen`, etc.; `GET /api/turnos` y C-03/C-04 necesitan el `Turno` completo. Decisión: `TurnoRepository<T extends TurnoRegistro = TurnoRegistro>` y `TurnoRepositoryEnMemoria<T extends TurnoRegistro = TurnoRegistro>`; `Deps.turnos: TurnoRepository<Turno>`. El default preserva todo uso existente (tests de C-01 sin cambios) y `new TurnoRepositoryEnMemoria()` en el seed infiere `T` del tipo contextual, por lo que `cargar-seed.ts`/`deps-vacias.ts` no se tocan.
Alternativas descartadas: (a) casts `as Turno` en la aplicación (ocultan errores de tipo); (b) mover `Turno` al puerto (pone el tipo de dominio fuera de la Zona y en la capa equivocada); (c) un segundo repositorio de turnos (dos fuentes de verdad).

### D3. Firma de la validación pura
```ts
validarNuevoTurno(candidato: { pacienteId; prestacionId; profesionalId; sillonId; inicio: Date },
  contexto: { prestacion: Prestacion; profesional: Profesional; bloqueos: readonly Bloqueo[];
              turnos: readonly TurnoExistente[] }): Result<{ inicio: Date; fin: Date }>
```
Devuelve el intervalo calculado (no un `Turno`: id, `creadoPor` y `creadoEn` son de la aplicación). `TurnoExistente = Pick<Turno, 'id' | 'profesionalId' | 'sillonId' | 'pacienteId' | 'inicio' | 'fin' | 'estado'>` (lo mínimo necesario, definido en `turno.ts`; un `TurnoRegistro` lo satisface estructuralmente) para que C-04 pase la lista sin el propio turno. Orden de chequeo, primer fallo gana: RN-AG-03 alineación (vía `crearIntervaloAlineado`) → RN-AG-04 franja → RN-AG-04 bloqueo (mismo profesional, mismo sillón o global) → RN-AG-02 profesional → RN-AG-02 sillón → RN-AG-05 paciente. Ignora `estado === 'cancelado'` aunque venga en la lista (defensa además del repo). Entre varios conflictos de una dimensión informa el de inicio más temprano (determinismo para tests). El chequeo de RN-AG-02 antes que RN-AG-05 deja a C-13 un único punto a saltear.

### D4. Franja en hora local
Se convierte `inicio`/`fin` a hora del consultorio restando 3 h y leyendo campos UTC (mismo enfoque que `cargar-seed.ts`); se obtiene día ISO y minutos desde 00:00, y se exige `desde ≤ inicioMin` y `finMin ≤ hasta` en el mismo día (RN-AG-01: fin igual al cierre es válido). Una franja nunca cruza medianoche. Helper privado dentro de `validarNuevoTurno.ts` (Zona); no se agrega a `shared`.

### D5. Caso de uso `crearTurno` y errores
`crearTurno(deps, usuario: Usuario | undefined, entrada)` → `Result<Turno, ErrorCrearTurno>` con `ErrorCrearTurno = { tipo: 'permiso', mensaje } | { tipo: 'entrada', mensaje } | { tipo: 'regla', error: ErrorDeRegla }`. Pasos: permiso (rol ∈ {recepcion, admin, paciente}) → resolver paciente/prestación/profesional/sillón (inexistente → `entrada`) → calcular rango `[inicio, inicio + duración)` → `bloqueos.listarEn(rango)` y `turnos.listarActivos({ rango })` → `validarNuevoTurno` → construir `Turno` (`id` = `randomUUID()` de `node:crypto`, `creadoEn` = `clock.ahora()`) → `turnos.guardar` → `auditoria.registrar({ accion: 'crear', entidad: 'turno', detalle: JSON del turno })`. La aplicación no conoce Express; la ruta traduce `ErrorCrearTurno` a `ErrorDePermiso`/`ErrorDeEntrada`/`FalloDeRegla` del middleware existente. Una sola consulta `listarActivos({ rango })` alcanza: el dominio separa por dimensión.

### D6. Forma del 409 (checkpoint MEDIUM con el equipo)
Se reutiliza tal cual la forma ya especificada en `salud-api`: `{ error: { tipo: 'regla', regla, mensaje, dimension?, conflicto?: { turnoId } } }`. RN-AG-02 lleva `dimension` `profesional`|`sillon`; RN-AG-05 `paciente`; ambos con `conflicto.turnoId`. RN-AG-03 y RN-AG-04 sin dimensión ni conflicto; el `mensaje` legible nombra el horario del turno en conflicto o el motivo del bloqueo. Elegido para no modificar `result.ts`/`errores.ts`; enriquecer `conflicto` queda en Open Questions.

### D7. Validación de entrada en la ruta
`POST`: los cinco ids/`inicio` deben ser strings; `inicio` debe parsear y tener zona explícita (`Z` o `±HH:MM`), para no depender del TZ del proceso; `origen` opcional ∈ {recepcion, whatsapp, telefono}, default `recepcion`; `fin` y campos desconocidos se ignoran. Inicio no alineado NO es 400: es regla `RN-AG-03` → 409 (Regla dura 13). `GET`: `desde`/`hasta` juntos, ISO con zona, `desde < hasta`; respuesta `{ turnos }` ordenada por `inicio`. Sin dependencia nueva de validación (zod, etc.).

### D8. Montaje
`app.ts` agrega `app.use('/api', turnosRouter(deps))` antes del 404 de `/api` (una línea, aditivo).

## Risks / Trade-offs

- [`structuredClone` del repo y `Date`] → se conserva el tipo `Date`; tests de API comparan strings ISO UTC.
- [Generic en el puerto toca archivos compartidos] → cambio de 3 líneas con default, revisado por el team lead (dueño de C-01 y C-02); tests de C-01 deben seguir verdes como red de seguridad.
- [`randomUUID` no determinista] → los tests usan el id devuelto, nunca uno fijo.
- [Carrera entre validar y guardar] → no aplica: Node single-thread y repo síncrono en memoria.
- [`conflicto` solo con `turnoId`] → la UI necesita otra consulta para mostrar el horario; mitigado con el `mensaje`.

## Migration Plan

No aplica (memoria, sin datos persistidos). Rollback = revertir el PR.

## Open Questions

- ¿Enriquecer `conflicto` con `inicio`/`fin`/`profesionalId`/`sillonId` (cambio aditivo en `ErrorDeRegla`)? Hoy solo `turnoId` (D6). No cambia specs ni tareas de C-02 si se decide después.
- ¿Un usuario `paciente` solo puede crear turnos para sí mismo? No hay vínculo usuario→paciente en el seed; se resolverá con el bot (C-06).
- ¿`GET /api/turnos` debe restringirse por rol (p. ej. odontólogo solo los propios)? Hoy no requiere rol, igual que `/api/catalogo`.
- ¿Rechazar turnos en el pasado o con profesional/sillón `activo: false`? No está en la ficha; no se valida en C-02.
