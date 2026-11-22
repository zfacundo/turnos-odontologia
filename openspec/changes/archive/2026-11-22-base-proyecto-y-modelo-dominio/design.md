# Design

## Context

Repositorio greenfield: solo existen `knowledge-base/`, `docs/`, `openspec/` y las instrucciones de agentes. No hay `package.json` ni código. Motivación y alcance en `proposal.md`; requisitos en `specs/`. Restricciones que dan forma al diseño: dominio puro (DD-04, regla dura 5), persistencia en memoria detrás de puertos (DD-03), intervalos `[inicio, fin)` (DD-06), errores 409 con código de regla (DD-08), auth simulada (DD-09), datos ficticios (DD-10), una duración por prestación (DD-12), Zona de C-01 y Strict TDD en apply.

## Goals / Non-Goals

**Goals:**
- Dejar estables y mínimos los puntos compartidos (`domain/shared`, `application/ports`, `api/app.ts`, seed) para que GATE 1 abra con pocas razones para tocarlos.
- Que cada pieza sea testeable sin red ni reloj real: `createApp(deps)` + supertest, repos en memoria reales, `Clock` fijo.

**Non-Goals:**
- Reglas de turno RN-AG-02..07 y casos de uso (`crearTurno` etc.) → C-02 en adelante.
- Endpoints de escritura de configuración/pacientes (C-07, C-08) y pantallas (`public/*.html`).
- Conversión general de franjas `HH:mm` a instantes (la necesita C-02/C-05; aquí solo se modela el tipo).

## Decisions

### D1. Estructura de carpetas (dentro de la Zona)

```
package.json · tsconfig.json · vitest.config.ts · README.md
src/
  server.ts                         # lee env (PORT, SEED, SIM_NOW), arma deps, app.listen
  domain/shared/
    result.ts                       # Result<T,E>, ok(), fallo(), ErrorDeRegla
    intervalo.ts                    # Intervalo, crearIntervalo, crearIntervaloAlineado, seSolapan
    bloques.ts                      # BLOQUE_MIN = 15, estaAlineadoA15(fecha)
    rol.ts                          # Rol, ROLES, Usuario
  domain/configuracion/
    sillon.ts · profesional.ts (Franja, DiaSemana) · bloqueo.ts
    prestacion.ts                   # Prestacion + validarPrestacion() → Result (RN-CF-01)
  domain/pacientes/paciente.ts      # Paciente
  application/ports/
    repositorios.ts                 # Sillon/Prestacion/Profesional/Bloqueo/Paciente/TurnoRepository, TurnoRegistro, FiltroTurnos
    clock.ts · auditoria.ts         # Clock { ahora(): Date }, Auditoria { registrar(e) }, EventoAuditoria
  infrastructure/
    memory/                         # un archivo por repo + auditoria-en-memoria.ts
    clock/                          # RelojDeSistema, RelojFijo, relojDesdeEnv(SIM_NOW)
    seed/                           # datos-seed.ts (constantes) + cargarSeed(clock) → Deps
  api/
    app.ts                          # createApp(deps): express.json, rolSimulado, static public/, rutas, 404, errores
    deps.ts                         # tipo Deps (repos + clock + auditoria)
    middleware/rol-simulado.ts · middleware/errores.ts (clases + manejador)
    routes/catalogo.ts              # catalogoRouter(deps)
public/styles/tokens.css · public/js/api.js
tests/domain/shared/ · tests/domain/configuracion/ · tests/infrastructure/ · tests/api/
```

`GET /api/health` vive dentro de `app.ts` porque la Zona solo prevé `routes/catalogo.ts`.

### D2. `Result` como unión discriminada, no excepciones (patrón de 08_arquitectura)

```ts
type Result<T, E = ErrorDeRegla> = { ok: true; valor: T } | { ok: false; error: E };
interface ErrorDeRegla {
  regla: string;                                   // 'RN-AG-01' | 'RN-AG-03' | 'RN-CF-01' | ...
  mensaje: string;
  dimension?: 'profesional' | 'sillon' | 'paciente';
  conflicto?: { turnoId: string };
}
```
Se agrega `mensaje` (legible para la UI) a la forma de la ficha `{ regla, dimension?, conflicto? }`. Alternativa descartada: excepciones tipadas en el dominio (obligan a try/catch y pierden exhaustividad en TS).

### D3. `Intervalo` con `Date` y alineación en UTC

`Intervalo = { readonly inicio: Date; readonly fin: Date }` creado solo por `crearIntervalo` (valida `inicio < fin`, RN-AG-01) o `crearIntervaloAlineado` (además alineación, RN-AG-03). `seSolapan(a,b) = a.inicio < b.fin && b.inicio < a.fin` comparando `getTime()` — nunca `<=` (regla dura 6). `estaAlineadoA15` usa `getUTCMinutes() % 15 === 0` y segundos/ms en 0: como el offset de `America/Argentina/Buenos_Aires` es −03:00 entero (sin DST), los minutos UTC coinciden con los locales, y el dominio no depende del `TZ` del proceso. Alternativa descartada: librería de fechas (dayjs/luxon) — innecesaria para C-01; C-02 puede revisarlo al convertir franjas.

### D4. Tipo mínimo `TurnoRegistro` en el puerto; el `Turno` completo es de C-02

`TurnoRepository` necesita un tipo de turno, pero `src/domain/agenda/` es Zona de C-02. Decisión: C-01 **no** define `Turno`; el puerto declara en `src/application/ports/repositorios.ts` solo el tipo estructural que necesita:

```ts
type EstadoTurnoRegistro = 'reservado' | 'confirmado' | 'cancelado' | 'atendido' | 'ausente';
interface TurnoRegistro { id: string; profesionalId: string; sillonId: string; pacienteId: string;
                          inicio: Date; fin: Date; estado: EstadoTurnoRegistro }
```
`listarActivos` excluye `estado === 'cancelado'`. C-02 crea el `Turno` completo (senado, esSobreturno, origen, creadoPor, creadoEn) en `src/domain/agenda/turno.ts`, que cumple estructuralmente `TurnoRegistro` (tipado estructural de TypeScript: sin import ni herencia). Racional: evitar dos tipos `Turno` en el repo y respetar la Zona de C-02 según CHANGES.md. Se descarta `ESTADOS_ACTIVOS` en `shared`; el criterio de "activo" queda en el repo.

### D5. Puertos

```ts
interface TurnoRepository {
  guardar(t: TurnoRegistro): void;
  actualizar(t: TurnoRegistro): Result<TurnoRegistro, ErrorDeRegla>;      // error si no existe
  buscarPorId(id: string): TurnoRegistro | undefined;
  listarActivos(f?: FiltroTurnos): TurnoRegistro[];               // { profesionalId?, sillonId?, pacienteId?, rango?: Intervalo }
}
interface PacienteRepository { guardar(p): Result<Paciente>; buscarPorId; buscarPorDni; listar }
interface SillonRepository / PrestacionRepository / ProfesionalRepository { listar(); buscarPorId(id) }
interface BloqueoRepository { listar(); listarEn(rango: Intervalo) }
interface Clock { ahora(): Date }
interface Auditoria { registrar(e: EventoAuditoria): void }
```
Síncronos (DD-03: sin concurrencia real; simplifica los tests). Los repos de configuración son de lectura en C-01; C-07/C-08 agregan escritura de forma aditiva. Duplicado de DNI → `ErrorDeRegla` con `regla: 'DNI_DUPLICADO'` (la KB no define un código RN para DNI único; queda anotado para que el equipo lo formalice).

Las implementaciones en memoria guardan copias (`structuredClone`) para que mutar el objeto de entrada/salida no altere el estado (requisito de auditoría inmutable; mismo criterio en repos). `AuditoriaEnMemoria` expone además `eventos()` (solo en la implementación, no en el puerto) para tests y la futura vista de registro (C-09).

### D6. Reloj

`RelojDeSistema` (único lugar con `new Date()` sin argumentos, en `infrastructure/clock`), `RelojFijo(instante)`, y `relojDesdeEnv(simNow?: string)`: si `SIM_NOW` está definida, parsea ISO y devuelve `RelojFijo`; si es inválida lanza `Error` mencionando `SIM_NOW` (falla rápida al arrancar). El dominio nunca importa el reloj: lo recibe por parámetro desde la aplicación.

### D7. Seed: `cargarSeed(clock): Deps`

- IDs legibles y estables: `sillon-1/2`, `prof-1/2`, `prest-control|orto|trat|est|urg`, `pac-01..10`, `u-admin`, `u-recepcion`, `u-odonto-1/2`.
- Prestaciones construidas con `validarPrestacion` (si alguna fallara, el seed lanza: error de programación).
- Profesionales: `disponibilidad` = lun-vie (`diaSemana` 1..5) × `{09:00-13:00, 14:00-19:00}`. Nombres tipo "Dra. Ficticia Pérez", matrícula `MN-FICT-0001`.
- Pacientes: 10, DNI `99000001..99000010` (string sin puntos), teléfono `+54 9 11 0000-0001..0010`, nombres inventados evidentes ("Paciente Ficticio Uno"…).
- Bloqueo "reservado urgencias": **global** (sin profesional ni sillón), `[18:30, 19:00)` hora Argentina, cada lunes a viernes durante **4 semanas** desde el lunes de la semana de `clock.ahora()`. Las fechas se arman con ISO con offset explícito `-03:00`, nunca con hora local del proceso. Alternativa descartada: bloqueo recurrente (regla semanal) — requiere un modelo de recurrencia que no está en la KB.
- Usuarios (`Usuario { id, nombre, rol, profesionalId? }`) se devuelven en `Deps.usuarios` como lista de solo lectura; no hay `UsuarioRepository` porque la ficha no lo incluye en los puertos.
- `TurnoRepository` arranca vacío. Lista de espera y obras sociales quedan para sus changes.
- `SEED=false` → `server.ts` arma repos vacíos.

### D8. `createApp(deps)` y middleware

`createApp(deps: Deps): Express` — `express.json()`, `rolSimulado`, `express.static('public')`, `GET /api/health`, `app.use('/api', catalogoRouter(deps))`, 404 JSON para `/api/*`, `manejadorDeErrores` al final. No hace `listen` (eso es `server.ts`), así supertest no abre puertos. Cada módulo futuro agrega una línea de `app.use`.

- **Rol simulado**: lee `X-Usuario`/`X-Rol`; si `X-Rol` presente y fuera de `ROLES` → `ErrorDeEntrada` (400). Si ausentes, `res.locals.usuario` queda `undefined`. Se usa `res.locals` tipado (no se aumenta `Request` globalmente) para evitar `declare global` compartido.
- **Errores** (`middleware/errores.ts`): clases `ErrorDeEntrada`, `ErrorDePermiso`, `FalloDeRegla(error: ErrorDeRegla)`; helper `lanzarSiFallo(result)` para rutas. El manejador mapea: `FalloDeRegla` → 409 `{ error: { tipo:'regla', regla, mensaje, dimension?, conflicto? } }`; `ErrorDeEntrada` → 400 `tipo:'entrada'`; `ErrorDePermiso` → 403 `tipo:'permiso'`; JSON malformado de `express.json` (`type === 'entity.parse.failed'`) → 400; resto → 500 `{ error: { tipo:'interno', mensaje:'Error interno' } }` y log a consola. Los tests del mapeo montan el manejador en una app Express mínima con rutas que lanzan cada error (no se mockea dominio ni repos).
- Validación de input **manual** (sin zod) — resuelve la pregunta abierta de prioridad Baja; C-01 no tiene endpoints con body.

### D9. Tooling

- `package.json`: `"type": "commonjs"`; scripts `dev` = `tsx watch src/server.ts`, `build` = `tsc`, `start` = `node dist/src/server.js`, `test` = `vitest run`, `typecheck` = `tsc --noEmit`. Deps: `express`; devDeps: `typescript`, `tsx`, `vitest`, `supertest`, `@types/express`, `@types/supertest`, `@types/node`. `engines.node >= 20`.
- `tsconfig.json`: `strict`, `noImplicitAny`, `noUncheckedIndexedAccess`, `module: CommonJS` + `moduleResolution: node` (evita exigir extensiones `.js` en imports, como pediría `Node16`/ESM); `target ES2022`; `include: ["src", "tests"]`, `outDir: dist`.
- `vitest.config.ts`: `environment: 'node'`, `include: ['tests/**/*.test.ts']`, `env.TZ = 'America/Argentina/Buenos_Aires'` (defensa adicional; el dominio no depende de él).
- `public/styles/tokens.css`: copia de las variables `:root` claro/oscuro del prototipo (`--bg`, `--accent`, `--t-control`…, fuentes Bricolage Grotesque / DM Sans), con `prefers-color-scheme` y `[data-theme]`. `public/js/api.js`: `api(path, { method, body })` que agrega `X-Usuario`/`X-Rol` desde `localStorage` y devuelve `{ ok, status, data }`. Sin tests automáticos (UI fuera del alcance de Vitest en C-01); verificación manual en tasks.

## Risks / Trade-offs

- [`TurnoRegistro` mínimo en el puerto] → si el `Turno` de C-02 dejara de satisfacerlo, el compilador lo marca; cambios al puerto son aditivos y los revisa el team lead.
- [Alineación por minutos UTC asume offset entero] → Argentina no tiene DST desde 2009; documentado en `bloques.ts` y cubierto por tests con `-03:00` explícito.
- [Seed de bloqueos por 4 semanas fijas] → si la demo usa `SIM_NOW` lejano, los bloqueos siguen a la fecha del reloj; reiniciar regenera.
- [Bloqueo de urgencias global] → bloquea 18:30-19:00 para todos; si el equipo prefiere por sillón, es un cambio de una línea en el seed (Ajustar antes de apply).
- [Código de regla para DNI duplicado no existe en la KB] → se usa `DNI_DUPLICADO`; C-08 puede formalizarlo.
- [Archivos de test fuera de la lista literal de la Zona] → se agregan `tests/domain/configuracion/`, `tests/infrastructure/`, `tests/api/catalogo.test.ts`, `tests/api/errores.test.ts`: son archivos nuevos propios de C-01, sin riesgo de conflicto; requieren visto bueno del team lead (Governance HIGH).
- [CommonJS en vez de ESM] → menos fricción con tsx/tsc/vitest para un TP de 2 días; migrable más adelante.

## Migration Plan

No aplica (greenfield). Rollback = revertir el PR de C-01.
