# Design

## Context

Ver `proposal.md` - Why y `specs/` para el contrato. Lo que heredamos y condiciona el diseño:

- `validarPrestacion` (RN-CF-01) ya existe en `src/domain/configuracion/prestacion.ts`.
- `Intervalo`, `crearIntervalo`, `seSolapan` y `crearIntervaloAlineado` (RN-AG-01/03) ya existen en `src/domain/shared/`.
- Los puertos de configuración (`SillonRepository`, `PrestacionRepository`, `ProfesionalRepository`, `BloqueoRepository`) son **solo lectura**; los repos en memoria reciben un arreglo `readonly` y devuelven copias con `structuredClone`.
- `crearTurno` resuelve prestación, profesional y sillón por `id`, pero **no mira `activo`**.
- `rolSimulado` arma `Usuario` con `id` y `rol`, sin `profesionalId`; el patrón para completarlo desde `deps.usuarios` está en `src/api/routes/turnos.ts`.
- `errores.ts` mapea `ErrorDePermiso → 403`, `ErrorDeEntrada → 400`, `FalloDeRegla → 409`; no hay clase para `404`.
- CODEOWNERS asigna `src/domain/`, `src/application/ports/`, `src/infrastructure/` y `src/application/agenda/` al team lead. Este change los toca de forma acotada y debe revisarse en el PR.

## Goals / Non-Goals

**Goals:**
- Implementar C-07 completo en esta rama (opción A), dejando explícitos los archivos compartidos tocados.
- Reutilizar el dominio y el patrón de errores existentes en lugar de inventar un segundo estilo.
- Que RN-CF-04 se cumpla de punta a punta: baja lógica + rechazo en el alta.

**Non-Goals:**
- Endpoint para desactivar profesionales (`desactivarProfesional`): la ficha solo pide `desactivarSillon`; el chequeo de `profesional.activo` queda listo para cuando exista ese endpoint.
- Filtrar profesionales inactivos en `GET /api/disponibilidad` (zona y spec de C-05).
- Auditoría de cambios de configuración (RN-AU-01 está redactada para turnos).
- UI de administración, duración por profesional (DD-12), reglas de autogestión (US-090).

## Decisions

### D1. Capability nueva y límites de spec
`configuracion-consultorio` agrupa las mutaciones y su RBAC. `catalogo-configuracion` queda intacta (modelo, seed y `GET /api/catalogo`). La única modificación de comportamiento fuera de la capability nueva es el alta de turnos: `agenda-turnos` recibe un requisito ADDED para RN-CF-04, y `persistencia-en-memoria` un requisito ADDED para la escritura de los repos de configuración.
*Alternativa descartada*: meter todo como requisitos MODIFIED de `catalogo-configuracion`; mezcla lectura con administración y ensucia el archive.

### D2. Puertos con escritura genérica
En `src/application/ports/repositorios.ts` se agrega:

```ts
export interface RepositorioMutable<T extends { id: string }> {
  guardar(item: T): void;
  actualizar(item: T): Result<T, ErrorDeRegla>;
  eliminar(id: string): Result<void, ErrorDeRegla>;
}
```

`SillonRepository`, `PrestacionRepository`, `ProfesionalRepository` y `BloqueoRepository` pasan a extender `RepositorioMutable<…>` conservando sus lecturas actuales (`listar`, `buscarPorId`, y `listarEn` en bloqueos). `guardar` es upsert por `id`; `actualizar` exige que el `id` exista y falla con `{ regla: '<ENTIDAD>_INEXISTENTE' }` (mismo precedente que `TURNO_INEXISTENTE`); `eliminar` falla igual si no existe.
*Alternativa descartada*: un puerto distinto por entidad; duplica cuatro veces lo mismo sin ganar nada.

### D3. Base mutua en memoria
Nuevo `src/infrastructure/memory/repositorio-en-memoria.ts`:

```ts
export abstract class RepositorioEnMemoria<T extends { id: string }> {
  protected abstract readonly codigoInexistente: string;
  private readonly items = new Map<string, T>();
  constructor(items: readonly T[] = []) { /* copia con structuredClone */ }
  listar(): T[]; buscarPorId(id): T | undefined;
  guardar(item: T): void; actualizar(item: T): Result<T, ErrorDeRegla>;
  eliminar(id: string): Result<void, ErrorDeRegla>;
}
```

Cada repo concreto (`sillon-repository.ts`, etc.) extiende la base, define su `codigoInexistente` y conserva lo específico (`listarEn` en bloqueos, que ahora recorre el `Map`). El clonado defensivo se mantiene en todas las salidas y entradas.
*Alternativa descartada*: copiar los tres métodos en cada repo; más ruido y más chance de divergencia.

### D4. Dominio: RN-CF-02 y validación de bloqueo
Nuevo `src/domain/configuracion/disponibilidad.ts`:

```ts
export function validarDisponibilidad(franjas: readonly Franja[]): Result<readonly Franja[]>
```

Recibe franjas con forma ya validada por la capa de API/aplicación (`diaSemana` entero 1..7 y hora exacta `HH:mm`): `diaSemana` 8, `25:00` o `9:00` son entrada malformada (`400`, `entrada`) y no llegan al dominio. El dominio valida `desde < hasta`, minutos múltiplos de 15 (`BLOQUE_MIN`) y solapamiento; todo rechazo usa `{ regla: 'RN-CF-02' }` (`409`). Ejemplo: `09:10` tiene forma válida pero está desalineado → `409`. Luego, para cada par del mismo `diaSemana`, rechaza si `a.desde < b.hasta && b.desde < a.hasta` (semiabierto: franjas contiguas `09:00-13:00` + `13:00-15:00` son válidas). No usa `Date`, por lo que es puro y no depende del TZ.
*Supuesto*: no se admiten franjas que crucen medianoche (`22:00-02:00`); se rechazan por `desde >= hasta`.

`src/domain/configuracion/bloqueo.ts` agrega:

```ts
export function validarBloqueo(b: Bloqueo): Result<Bloqueo>
```

Reutiliza `crearIntervaloAlineado(b.intervalo.inicio, b.intervalo.fin)` para devolver `RN-AG-01`/`RN-AG-03`. El `motivo` no vacío se valida en la capa de aplicación/API como error de entrada (`400`), porque no es una regla de negocio.

### D5. Casos de uso (uno por operación)
En `src/application/configuracion/`:

| Archivo | Firma | Permiso |
|---|---|---|
| `crearSillon.ts` | `(deps, usuario, { nombre })` | admin |
| `desactivarSillon.ts` | `(deps, usuario, sillonId)` | admin |
| `crearPrestacion.ts` | `(deps, usuario, { codigo, nombre, duracionMin })` | admin |
| `actualizarPrestacion.ts` | `(deps, usuario, id, { nombre, duracionMin })` | admin |
| `definirDisponibilidad.ts` | `(deps, usuario, profesionalId, franjas)` | admin |
| `crearBloqueo.ts` | `(deps, usuario, { motivo, inicio, fin, profesionalId?, sillonId? })` | admin/recepción/odontólogo propio |
| `eliminarBloqueo.ts` | `(deps, usuario, bloqueoId)` | admin/recepción/odontólogo propio |

Tipo común en `src/application/configuracion/errores.ts`:

```ts
export type ErrorConfiguracion =
  | { tipo: 'permiso'; mensaje: string }
  | { tipo: 'entrada'; mensaje: string }
  | { tipo: 'no-encontrado'; mensaje: string }
  | { tipo: 'regla'; error: ErrorDeRegla };
```

Orden de validación, primer fallo gana: usuario/rol (`403`) → forma de la entrada (`400`) → recurso inexistente (`404`) → propiedad del odontólogo (`403`) → regla de dominio (`409`). La forma (textos con `trim` no vacío, `diaSemana` entero 1..7, `HH:mm` exacto) se valida en el caso de uso antes de tocar repositorios; la ruta solo parsea tipos y traduce el `entrada` a `400`. Todos los ids nuevos usan `randomUUID()`; no se usa `Clock` porque ninguna entidad de configuración guarda fecha.
*Alternativa descartada*: un único caso de uso "configurar" con `switch`; complica permisos y tests.

Detalle por caso:
- `desactivarSillon`: baja lógica (`{ ...sillon, activo: false }`), nunca `eliminar`. Devuelve el sillón. Si ya estaba inactivo, vuelve a responder `200` con `activo: false` (idempotente).
- `crearPrestacion`/`actualizarPrestacion`: `codigo` y `nombre` se validan con `trim` no vacío (`entrada`, `400`); `codigo` es inmutable en la actualización, que exige `nombre` y `duracionMin` (PUT = reemplazo). La duración se valida con `validarPrestacion` (`RN-CF-01`, `409`).
- `definirDisponibilidad`: valida forma (`diaSemana` entero 1..7, `HH:mm` exacto) → `entrada` (`400`); luego `validarDisponibilidad` (desalineación/orden/solape) → `RN-CF-02` (`409`); reemplaza el arreglo completo del profesional con `actualizar`. Idempotente por construcción.
- `crearBloqueo`: valida referencias (`profesionales.buscarPorId`, `sillones.buscarPorId`) → `400` si no existen; arma el `Intervalo` con `crearIntervaloAlineado` y revalida con `validarBloqueo`; persiste con `guardar`.
- `eliminarBloqueo`: lee el bloqueo, verifica propiedad si el rol es odontólogo y llama `eliminar`.
- RBAC del odontólogo: `usuario.profesionalId` debe existir y coincidir con el `profesionalId` del bloqueo; un bloqueo global o de otro profesional da `403`.

### D6. RN-CF-04 en `crearTurno`
En `src/application/agenda/crearTurno.ts`, después de resolver prestación, profesional y sillón y antes de `validarNuevoTurno`:

```ts
if (!profesional.activo || !sillon.activo) {
  return fallo({ tipo: 'regla', error: { regla: 'RN-CF-04', mensaje: '…' } });
}
```

Así una entidad inexistente sigue dando `400` y una inactiva gana sobre cualquier regla de agenda (franja, bloqueo o solapamiento), que es el comportamiento que describe el spec. El cambio es mínimo y no altera el camino feliz ni las firmas.
*Riesgo de coordinación*: C-04 (`reprogramarTurno`) debe replicar este chequeo cuando exista. Se deja anotado en `proposal.md` y en el handoff.

### D7. Contratos HTTP
`src/api/routes/configuracion.ts` exporta `configuracionRouter(deps)` y se monta en `app.ts` con una línea.

| Método y ruta | Cuerpo / query | Éxito |
|---|---|---|
| `POST /api/sillones` | `{ nombre }` | `201` sillón |
| `DELETE /api/sillones/:id` | — | `200` sillón con `activo:false` |
| `POST /api/prestaciones` | `{ codigo, nombre, duracionMin }` | `201` prestación |
| `PUT /api/prestaciones/:id` | `{ nombre, duracionMin }` | `200` prestación |
| `PUT /api/profesionales/:id/disponibilidad` | arreglo de `Franja` | `200` profesional |
| `GET /api/bloqueos` | `desde?, hasta?, profesionalId?, sillonId?` | `200 { bloqueos }` |
| `POST /api/bloqueos` | `{ motivo, inicio, fin, profesionalId?, sillonId? }` | `201` bloqueo |
| `DELETE /api/bloqueos/:id` | — | `204` sin cuerpo |

Parseo en la ruta (mismo estilo que `turnos.ts`): `texto`, `entero`, `arreglo`, `HH:mm` (`/^([01]\d|2[0-3]):[0-5]\d$/`), fecha ISO con zona explícita, `desde < hasta`. `PUT disponibilidad` recibe el arreglo directo (no envuelto en objeto). La ruta parsea tipos y delega la forma al caso de uso: `diaSemana` entero 1..7, `HH:mm` exacto (`25:00`/`9:00` → `400`) y textos con `trim` no vacío; un `09:10` pasa la forma y lo rechaza el dominio con `RN-CF-02` (`409`).
Filtros de bloqueos: el rango usa la semántica semiabierta de `listarEn`; `profesionalId`/`sillonId` conservan los bloqueos globales (campo ausente) y los de esa dimensión, y se combinan con AND.
Traducción de errores: `permiso → ErrorDePermiso`, `entrada → ErrorDeEntrada`, `regla → FalloDeRegla`. El `404` se responde directo en la ruta (misma forma que el 404 de C-03), porque el middleware no tiene una clase para eso y está fuera de la Zona.
`GET /api/bloqueos` exige rol admin, recepción u odontólogo; sin usuario → `403`.

### D8. Resolución del usuario completo
Igual que en `turnos.ts`, `configuracion.ts` resuelve el usuario de `res.locals.usuario` contra `deps.usuarios` por `id` + `rol` para obtener `profesionalId`. No se modifica `rolSimulado` (fuera de Zona). Un odontólogo que no esté en `deps.usuarios` no puede operar sobre bloqueos propios (`403`).

### D9. Tests
- Dominio: `tests/domain/configuracion/disponibilidad.test.ts` (solapamiento, contiguas, desalineación, `desde >= hasta`, días distintos) y casos de `validarBloqueo`.
- Aplicación: `tests/application/configuracion/*.test.ts` con `cargarSeed(new RelojFijo(...))` y repos reales; para RN-CF-04 se usa `crearTurno` real tras desactivar un sillón.
- API: `tests/api/configuracion.test.ts` con supertest y headers `X-Rol`/`X-Usuario`; cubre 201/200/204/400/403/404/409 y los escenarios de filtros.
- Sin mocks de dominio ni de repositorios; fechas fijas con offset `-03:00`.
- Primer paso de Apply: baseline `npm test` + `npm run typecheck`.

## Risks / Trade-offs

- [`crearTurno.ts` es de otra zona] → Cambio de 5 líneas, documentado en `proposal.md`; el PR lo revisa el team lead. C-04 debe replicar el chequeo.
- [Huecos de un profesional inactivo se siguen ofreciendo] → RN-CF-04 solo corta el alta; el bot podría ofrecer un hueco que luego falla. Mitigación: documentarlo y abrir un follow-up para filtrar profesionales inactivos en `consultarHuecos` (spec `disponibilidad`).
- [`DELETE /api/sillones/:id` es baja lógica, no borrado] → Nombre HTTP impreciso pero conserva turnos (RN-CF-04). Se documenta en el contrato y en la respuesta (`activo:false`).
- [Sin auditoría de configuración] → RN-AU-01 habla de turnos; si el equipo la quiere, se agrega en un change posterior sin cambiar este contrato.
- [Cambiar la duración de una prestación no recalcula turnos existentes] → Los turnos guardan `fin`; el cambio afecta solo altas y huecos futuros. Aceptado y documentado.
- [`PUT disponibilidad` reemplaza toda la semana] → Un cliente que mande un subconjunto pierde las demás franjas; es el contrato idempotente elegido.
- [Repos mutables en memoria] → Sin concurrencia real (Node de un solo hilo); el clonado evita aliasing.

## Migration Plan

Sin migración: persistencia en memoria y seed válido. Rollback = revertir el PR; los endpoints son nuevos y el único cambio de contrato es el `409 RN-CF-04` en el alta, que solo aparece con entidades inactivas (inexistentes en el seed).

## Open Questions

- ¿Filtrar profesionales inactivos en `GET /api/disponibilidad`? Queda como follow-up de la capability `disponibilidad`.
- ¿Exponer `desactivarProfesional`? Fuera de la ficha; el chequeo de RN-CF-04 ya está listo.
- ¿Auditar altas/bajas de configuración? Hoy no; se puede sumar después.
