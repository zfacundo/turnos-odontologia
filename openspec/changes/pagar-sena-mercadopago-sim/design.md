# Design

## Context

Ver proposal.md (Why). Lo que ya existe y moldea el diseño:

- `Turno` (`src/domain/agenda/turno.ts`, de C-02) ya tiene `senado: boolean` (se crea en `false`) y `actualizadoEn?`. C-11 no modifica ese archivo.
- `TurnoRepository<Turno>` (`src/application/ports/repositorios.ts`): `buscarPorId` devuelve una copia y `actualizar(turno)` devuelve `Result` (falla con `TURNO_INEXISTENTE`).
- Patrón de caso de uso de C-02/C-03: `fn(deps, usuario, entrada) → Result<T, { tipo: 'permiso' | 'entrada' | 'no-encontrado', mensaje } | { tipo: 'regla', error }>`. La ruta lo traduce a `403 / 400 / 404 / 409` usando `ErrorDePermiso`, `ErrorDeEntrada` y `FalloDeRegla` de `src/api/middleware/errores.ts`, y responde el 404 directamente (como en `routes/turnos.ts`).
- `rolSimulado` deja en `res.locals.usuario` un `Usuario { id, rol }`, o `undefined` si no hay header `X-Rol`.
- `Deps` (`src/api/deps.ts`) es compartido y no tiene un repositorio de pagos. Agregarlo sería tocar un archivo fuera de la Zona.
- `Clock.ahora()` es la única fuente de hora. `Auditoria.registrar(evento)` solo inserta, y su `accion` es un `string`.
- Línea base: `master` tiene 14 tests en rojo, ajenos a C-11 (`app.ts` no monta `odontogramaRouter` ni `auditoriaRouter`).

## Goals / Non-Goals

**Goals:**
- Regla de "¿se puede señar este turno?" como función pura, testeable sin repositorios.
- Módulo autocontenido en `src/simulators/mercadopago/`, que se monta en `app.ts` con una sola línea de `app.use` (más su `import`) y no toca `Deps`, el seed ni el middleware.
- La misma forma de error que C-02/C-03 (DD-08).
- Dejar un patrón que C-12 (ARCA) pueda copiar.

**Non-Goals:**
- `GET` de pagos, listado o historial en la UI.
- Verificar que el turno pertenezca al paciente que paga (no hay vínculo usuario ↔ paciente, igual que en C-02/C-03).
- Qué pasa con `senado` al cancelar o reprogramar (C-03/C-04).
- Montos por prestación, moneda o reembolsos.

## Decisions

### D1. Estructura del módulo
```
src/simulators/mercadopago/
  pagoSena.ts                 dominio puro: tipo PagoSena, MONTO_SENA_SIMULADA, AVISO_SIMULACION, validarPagoSena
  pagoSenaRepository.ts       puerto PagoSenaRepository + PagoSenaRepositoryEnMemoria
  pagarSena.ts                caso de uso (aplicación)
  router.ts                   mercadoPagoRouter(deps, pagos?)
public/sim/mercadopago.html   pantalla falsa (HTML + JS inline, reutiliza public/styles/tokens.css)
tests/simulators/mercadopago/ dominio, caso de uso, API, sin-red y pantalla
```
*Por qué todo en una carpeta y no repartido en `src/domain/`, `src/application/` e `src/infrastructure/`*: la Zona de C-11 es `src/simulators/mercadopago/`. Las capas se respetan por archivo: `pagoSena.ts` no importa Express, `fs` ni lee el reloj (regla dura 5).

### D2. Modelo `PagoSena`
`{ id, turnoId, monto, estado: 'aprobado' | 'rechazado', fecha, simulado: true }`, igual a `04_modelo_de_datos.md`. `simulado` es del tipo literal `true`. El `id` sale de `randomUUID()` en la capa de aplicación (como en `crearTurno`), nunca en el dominio.

### D3. Monto: constante ficticia
`MONTO_SENA_SIMULADA` es una constante exportada de `pagoSena.ts` (ej. `5000`, sin moneda real asociada). El cliente no la envía y `Prestacion` no tiene precio. Ver Open Questions.
*Alternativa*: que el cliente mande el monto → descartada: abre validaciones (negativos, decimales) que no aportan a la demo.

### D4. Se guardan todos los intentos; como máximo uno aprobado por turno
Cada intento que pasa las validaciones se guarda, sea aprobado o rechazado. La relación real es `Turno 1──0..N PagoSena`, con **como máximo un `PagoSena` `aprobado` por turno**. Esta regla la garantiza la validación "turno ya señado" (D5), no el repositorio.
**Nota para el team lead**: `04_modelo_de_datos.md` dice `Turno 1──0..1 PagoSena`. C-11 no edita la KB (fuera de Zona). Se propone corregirla a "0..N intentos, máx. 1 aprobado" en un PR del team lead.

### D5. Validación pura y orden de chequeos
`validarPagoSena(turno: Pick<Turno, 'id' | 'estado' | 'senado'>): Result<true, ErrorDeRegla>`:
1. `estado` fuera de `{reservado, confirmado}` → `{ regla: 'RN-SM-01', mensaje: 'Solo se puede señar un turno reservado o confirmado (SU-07); el turno está <estado>.', conflicto: { turnoId } }`.
2. `senado === true` → `{ regla: 'RN-SM-01', mensaje: 'No se puede pagar la seña: turno ya señado.', conflicto: { turnoId } }`.

El estado se chequea antes que la marca: para un turno cancelado y señado, lo más útil es "está cancelado". No se crean RN nuevas: RN-SM-01 es la regla del flujo y el mensaje cita SU-07.

Orden en el caso de uso (gana el primer fallo): rol (403) → cuerpo (400) → turno inexistente (404) → `validarPagoSena` (409) → registrar.
*Rol antes que cuerpo*: mismo criterio que C-03 (`validarRol` primero). C-02 valida el cuerpo antes y lo dejó como decisión abierta. Acá se elige el orden de C-03 para que un rol no habilitado nunca reciba información sobre el formato.

### D6. Caso de uso `pagarSena`
`pagarSena(deps: { turnos, pagos, clock, auditoria }, usuario: Usuario | undefined, entrada: { turnoId, resultado }) → Result<{ pago: PagoSena; turno: Turno }, ErrorPagarSena>`.
- Permiso: solo el rol `paciente` (matriz de `03_actores_y_roles.md`: el paciente crea, admin y recepción solo leen, el odontólogo no participa). Sin usuario → 403.
- `resultado === 'aprobado'` → `turnos.actualizar({ ...turno, senado: true, actualizadoEn: ahora })`. Si `actualizar` falla (carrera teórica), se devuelve 404 y no se guarda el pago.
- `resultado === 'rechazado'` → no se llama a `actualizar` y el turno devuelto es el leído.
- Luego `pagos.guardar(pago)` y `auditoria.registrar({ accion: 'sena_aprobada' | 'sena_rechazada', entidad: 'turno', entidadId: turno.id, fecha: ahora, usuarioId, rol, detalle: JSON.stringify({ pagoId, monto, simulado: true }) })`.
- *Entidad `turno` y no `pago_sena`*: el registro del sistema (C-09) y la auditoría se leen por turno. El id del pago va en `detalle`.

### D7. Repositorio de pagos propio, sin tocar `Deps`
`PagoSenaRepository { guardar(p); listarPorTurno(turnoId): PagoSena[] }`, implementado en memoria con `structuredClone`, igual que `TurnoRepositoryEnMemoria`. `listarPorTurno` no se expone por HTTP: lo usan los tests del caso de uso para verificar qué se registró (repositorio real, sin mocks, regla dura 7).
La fábrica del router es `mercadoPagoRouter(deps: Deps, pagos: PagoSenaRepository = new PagoSenaRepositoryEnMemoria()): Router`. En `app.ts` alcanza con `app.use('/api', mercadoPagoRouter(deps));`: cada `createApp` tiene su propio repositorio de pagos, así los tests de API quedan aislados. Los tests que necesitan inspeccionar los pagos a nivel HTTP pueden montar el router con un repositorio propio, en una app de prueba.
*Alternativa*: agregar `pagos` a `Deps` y al seed → descartada: toca `deps.ts`, `cargar-seed.ts` y `deps-vacias.ts`, todos fuera de la Zona.

### D8. Contrato HTTP
`POST /api/sim/mercadopago/pagos`, con cuerpo `{ turnoId: string no vacío, resultado: 'aprobado' | 'rechazado' }`.
- `201`: `{ simulado: true, aviso: 'SIMULACIÓN — no es Mercado Pago real', pago: PagoSena, turno: { id, estado, senado } }`. Responde `201` en ambos resultados, porque en los dos se crea un recurso (el intento). El resultado del pago está en `pago.estado`.
- `400 / 403 / 409`: el middleware compartido con el formato de DD-08. `404`: `{ error: { tipo: 'no-encontrado', mensaje } }`, igual que C-03.
- Los cuerpos de error no llevan `aviso`: el formato de error es compartido y cambiarlo sería salir de la Zona. La ruta `/api/sim/...` ya identifica al simulador.
- `AVISO_SIMULACION` es una constante única en `pagoSena.ts`, y la pantalla repite el mismo texto.

### D9. Pantalla `public/sim/mercadopago.html`
HTML + CSS + JS inline, sin framework, que importa `/styles/tokens.css`. Muestra un banner fijo "SIMULACIÓN — no es Mercado Pago real", lee `turnoId` de `location.search` y, si falta, muestra un aviso y deshabilita los botones. Aprobar y Rechazar hacen `fetch('/api/sim/mercadopago/pagos', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Rol': 'paciente', 'X-Usuario': 'paciente-sim' }, body })` y muestran el resultado ("Seña aprobada: tu turno quedó señado" / "Pago rechazado: tu turno no cambió") o `error.mensaje`. Solo usa rutas relativas. Un enlace a esta pantalla desde la agenda o el bot queda para C-09/C-06.

### D10. Verificación "sin red"
Hay dos tests, en `tests/simulators/mercadopago/sin-red.test.ts`:
1. **Dinámico**: `vi.spyOn` sobre `globalThis.fetch`, `http.request`, `https.request` y `net.connect`, haciendo que cualquier llamada lance un error. Se corre el flujo aprobado y rechazado a través del caso de uso con repositorios reales, y se verifica que no hubo llamadas. Interceptar la red no es mockear el dominio ni los repositorios (regla dura 7).
   *Por qué a nivel caso de uso y no con supertest*: supertest abre un socket local, que dispararía el detector de `net`/`http`.
2. **Estático**: lee los `.ts` de `src/simulators/mercadopago/` y `public/sim/mercadopago.html` (el `fs` está en el test, no en el dominio) y verifica que no haya `fetch(` (salvo en el HTML, con ruta relativa), `node:http`, `https`, `net`, `axios` ni `mercadopago`, y que el HTML no tenga URLs `http(s)://`.

### D11. Comportamiento de la pantalla: verificación manual
El spec cubre solo lo que se puede testear con Vitest: que la pantalla se sirve con el rótulo y los botones (supertest), y que solo llama a la ruta propia con rol `paciente` (análisis estático). El proyecto no tiene DOM de test, así que dos comportamientos de D9 quedan **fuera del spec** y se verifican **a mano** en la tarea 5.3:
1. Al tocar Aprobar o Rechazar, la pantalla muestra el resultado ("Seña aprobada: tu turno quedó señado" / "Pago rechazado: tu turno no cambió") o el `error.mensaje` de la API.
2. Sin `?turnoId=` en la URL, la pantalla lo avisa y deshabilita los botones, sin ofrecer el pago.

Lo que se observe en esa verificación se anota en el handoff (`knowledge-base/entrega/C-11.md`).

### D12. Cómo se sirve la pantalla
`createApp` ya monta `express.static(path.join(__dirname, '..', '..', 'public'))`, que incluye las subcarpetas. Por eso `public/sim/mercadopago.html` queda disponible en `/sim/mercadopago.html` sin tocar `app.ts` para eso: la única línea que agrega C-11 es la del router. Se comprobó el 2026-11-24 con `npm run dev`/tsx y con la app de los tests: `/odontograma.html` y `/styles/tokens.css` responden 200, y `/sim/mercadopago.html` responde 404 solo porque el archivo todavía no existe.
**Problema previo, ajeno a C-11** (nota para el team lead): con `npm run build` + `npm start`, `__dirname` pasa a ser `dist/src/api`, así que la ruta apunta a `dist/public`, que `tsc` no crea. En ese modo no se sirve ninguna pantalla de `public/`, tampoco las existentes. No afecta a `npm run dev` ni a los tests.

### Convenciones de los escenarios del spec
Son las del bloque inicial de `specs/pago-sena-simulado/spec.md`: turno `T` de `prest-control`, `pac-01`, `prof-1`, `sillon-1`, `2026-12-01 10:00–10:30` (UTC-03:00), y el reloj fijo en `2026-11-30T09:00:00-03:00`. Los tests llevan nombres "dado … cuando … entonces …" (regla dura 8). Los turnos `cancelado`, `atendido` y `ausente` se arman directamente en el repositorio en memoria a partir de `T`, sin depender del endpoint de C-03.

## UI Mockups

- Design system revision: no aplica (no existe `design-system/README.md` ni `visual_design.mode` en `.active-orchestrator-state.json`).
- Decision: no (2026-11-24, confirmado por la persona responsable: sin gate de mockups para este change). La pantalla es un simulador de una sola vista, con dos botones y un rótulo, y reutiliza `public/styles/tokens.css` como `odontograma.html`.
- Mockups: —
- Approval: —

## Risks / Trade-offs

- [El repositorio de pagos vive en el router y no en `Deps`] → otros módulos (C-09 registro, C-12) no pueden leer los pagos. Mitigación: lo que necesitan leer está en la auditoría (`sena_aprobada` / `sena_rechazada`). Si hiciera falta el repositorio, se mueve a `Deps` con un PR del team lead.
- [El paciente puede señar cualquier turno] → limitación conocida, compartida con C-02/C-03, documentada en el spec. Ningún change del roadmap crea un vínculo entre usuario y paciente: queda como pregunta abierta (ver Open Questions).
- [Los cuerpos de error no llevan el aviso de simulación] → la ruta `/api/sim/` y la pantalla lo rotulan. Ampliarlo implicaría tocar el middleware compartido.
- [La KB dice 0..1 PagoSena por turno] → se documenta en D4 con una nota para el team lead.
- [La línea base de `master` está en rojo (14 tests)] → C-11 no puede cumplir "npm test en verde" hasta que el team lead monte `odontogramaRouter` y `auditoriaRouter` en `app.ts`. Mitigación: avisarle antes del apply. Mientras tanto se verifica con `npx vitest run tests/simulators/mercadopago` y se reporta el resto aparte.
- [Conflicto de merge en `app.ts`] → solo se agrega al final del bloque de `app.use('/api', …)` y antes del 404 de `/api`.

## Migration Plan

No aplica: módulo y endpoint nuevos, sin datos persistidos ni cambios a contratos existentes. El rollback es revertir el PR (y la línea de `app.ts`).

## Open Questions

- **Monto de la seña**: `MONTO_SENA_SIMULADA` es una constante ficticia. Falta definir si debe depender de la prestación o ser configurable (C-07). Cambiarlo no modifica los escenarios: el spec solo exige "el monto ficticio fijo del simulador".
- **Propiedad del turno**: el sistema no verifica que el turno sea del paciente que paga, porque no existe un vínculo entre usuario y paciente y ningún change del roadmap lo define. Cómo y dónde modelarlo queda abierto para el equipo. Si se agrega, sumaría un escenario 403 al spec, sin cambiar el resto.
