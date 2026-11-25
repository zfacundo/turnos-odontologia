# CHANGES — Secuencia de Implementación

> Índice canónico de todos los changes del proyecto **Turnos Odontología** (TP universitario, entrega **martes 2026-11-24**).
> Cada change es atómico y chico: **una funcionalidad, no un módulo** (~2-4 h por persona o agente).
> Alcance: **solo el MVP** de `docs/discovery/discovery.md` §5 (núcleo de agenda + 5 simuladores). Nada de "etapas posteriores" (`informe-discovery.md` §6.3).
> **Leer este archivo antes de empezar un item.**

---

## Cómo usar este documento

1. **Identificar el item**: buscá tu nombre en el campo `Responsable` y elegí la ficha cuyo `Depende de` ya esté `[x]` (o mergeado en `main`).
2. **Verificar dependencias y leer la KB**: leé los archivos de "Leer antes"; la KB (`knowledge-base/`) es la fuente de verdad. Las decisiones DD-01..DD-12 de `09_decisiones_y_supuestos.md` no se rediscuten.
3. **Acordar alcance y verificación**: corré el ciclo OPSX (`/opsx:propose <slug>` → `/opsx:apply <slug>`) con Strict TDD (red → green → refactor, Vitest). Respetá el "Fuera de alcance" de la ficha.
4. **Verificar el resultado**: todos los criterios de aceptación de la ficha deben estar cubiertos por tests en verde (`npx vitest run`). Abrí PR contra `main`; el team lead revisa y mergea.
5. **Actualizar estado**: marcá `[x]` en `Estado` y archivá el change (`/opsx:archive <slug>`).

Reglas transversales (todas las fichas):
- **Solo datos ficticios** (RN-DA-01): nombres inventados, DNI `00.000.0NN`, teléfonos `+54 9 11 0000-00NN`. Nunca datos reales en código, tests, seeds ni capturas.
- **Simuladores rotulados "SIMULACIÓN"** en UI y docs (RN-DA-02, RN-SM-04); sin llamadas de red a servicios externos ni credenciales.
- **No editar archivos de otra zona**. Los archivos compartidos (ver "Zonas compartidas") solo se tocan de forma **aditiva** y el PR lo revisa el team lead.
- IDs de ficha estables: no renumerar; trabajo nuevo recibe un ID nuevo.

---

## Árbol de dependencias

```
C-01 base-proyecto-y-modelo-dominio                    [Team lead]
  ├── C-07 configurar-agenda-del-consultorio           [Integrante 3]  (solo necesita C-01)
  ├── C-08 ficha-paciente-y-cobertura-obra-social-sim  [Integrante 3]  (solo necesita C-01)
  └── C-02 crear-turno-sin-solapamientos               [Team lead]  ← primer change OPSX; desbloquea TODO
        │
        ├── C-03 cambiar-estado-y-cancelar-turno       [Integrante 1]
        │     └── C-04 reprogramar-turno               [Integrante 1]
        ├── C-05 calcular-huecos-libres                [Integrante 2]
        │
        │   C-03 + C-04 + C-05 + C-08 ──► C-06 bot-whatsapp-simulado   [Integrante 2]
        │
        ├── C-09 vista-agenda-y-registro-del-sistema   [Integrante 4]
        ├── C-10 odontograma-donde-te-duele            [Integrante 4]
        ├── C-11 pagar-sena-mercadopago-sim            [Integrante 5]
        ├── C-12 emitir-factura-c-arca-sim             [Integrante 5]
        │
        ├── C-13 sobreturno-explicito                  [stretch — sin asignar]  (opcional)
        └── C-14 lista-de-espera-ofrece-huecos         [stretch — sin asignar]  (opcional, también C-03)
```

### Paralelismo por fase

```
GATE 0: (nada) → arranca el team lead
  → C-01 base-proyecto-y-modelo-dominio        [Team lead]
     (mientras tanto, Integrantes 1..5 leen la KB de sus fichas y preparan
      /opsx:propose de su primer change; NO escriben código en zonas compartidas)

GATE 1: C-01 ✓
  → C-02 crear-turno-sin-solapamientos         [Team lead]
     (en paralelo y sin depender del núcleo de turnos, pueden empezar con datos de C-01:)
  → C-08 ficha-paciente-y-cobertura-obra-social-sim   [Integrante 3]
  → C-07 configurar-agenda-del-consultorio     [Integrante 3 — después de C-08]

GATE 2: C-02 ✓                                         ← FORK PRINCIPAL (5 personas en paralelo)
  → C-03 cambiar-estado-y-cancelar-turno       [Integrante 1]
  → C-05 calcular-huecos-libres                [Integrante 2]
  → C-07 / C-08 (si no terminaron)             [Integrante 3]
  → C-09 vista-agenda-y-registro-del-sistema   [Integrante 4]
  → C-11 pagar-sena-mercadopago-sim            [Integrante 5]
  → (Team lead: revisión de PR + C-13 stretch si sobra tiempo)

GATE 3: C-03 ✓ y C-05 ✓
  → C-04 reprogramar-turno                     [Integrante 1]
  → C-10 odontograma-donde-te-duele            [Integrante 4]
  → C-12 emitir-factura-c-arca-sim             [Integrante 5]
  → C-06 bot-whatsapp-simulado                 [Integrante 2 — si C-08 ✓; la opción "Necesito cambiarlo" se cablea cuando C-04 ✓]
  → C-14 lista-de-espera-ofrece-huecos         [stretch — sin asignar]

GATE 4: C-04 ✓ y C-06 ✓ → demo de punta a punta (integración final en main)
```

### Camino crítico (6 changes — mínimo irreducible)

```
C-01 → C-02 → C-03 → C-04 → C-06*
                     C-05 ──┘
```

`C-01 base` → `C-02 crear-turno` → `C-03 estados+cancelar` → `C-04 reprogramar` → `C-06 bot WhatsApp sim` (que además espera a `C-05` y `C-08`).
\* El bot es el último eslabón porque integra crear, confirmar, cancelar, reprogramar y huecos. Si C-04 se atrasa, el bot se entrega con reservar/confirmar/cancelar y la opción "Necesito cambiarlo" se suma en un PR posterior.

C-01 y C-02 son **bloqueantes absolutos**: el equipo completo depende de ellos. El team lead debe tenerlos mergeados el **día 1 (2026-11-22/23)** para que el día 2 sea 100 % paralelo.

### Plan multi-persona / multi-agente (6 integrantes)

Reparto equitativo: **2 changes por persona = 12 changes**. C-13 y C-14 son *stretch* sin responsable.

| Paso | Team lead | Integrante 1 (ciclo de vida del turno) | Integrante 2 (motor de huecos + bot) | Integrante 3 (configuración + pacientes) | Integrante 4 (UI agenda + odontograma) | Integrante 5 (simuladores de cobro) |
|---|---|---|---|---|---|---|
| 1 | C-01 base | lee KB, propone C-03 | lee KB, propone C-05 | lee KB, propone C-08 | lee KB, propone C-09 | lee KB, propone C-11 |
| 2 | C-02 crear-turno | — (espera C-02) | — (espera C-02) | C-08 pacientes + cobertura sim | maqueta estática C-09 desde prototipo | maqueta estática C-11 |
| 3 | revisa/mergea PR | C-03 estados + cancelar | C-05 huecos | C-07 configuración | C-09 agenda + registro | C-11 seña MP sim |
| 4 | revisa/mergea PR · C-13 stretch | C-04 reprogramar | C-06 bot WhatsApp sim | revisa PR / C-14 stretch | C-10 odontograma | C-12 factura C ARCA sim |
| 5 | integración final, README, demo | soporte al bot (C-06) | cierra C-06 | pruebas de demo | pulido visual | pruebas de demo |

Multi-agente: cada persona puede correr su change con un agente (Claude/Codex) usando `/opsx:apply`; un agente por change y por rama (`<id>-<slug>`, ej. `C-02-crear-turno-sin-solapamientos`), nunca dos agentes sobre la misma zona.

### Zonas compartidas (para CODEOWNERS)

| Archivo / carpeta compartida | Dueño | Cómo se modifica |
|---|---|---|
| `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts` | Team lead (C-01) | Solo el team lead agrega dependencias; pedirlo en el PR. |
| `src/api/app.ts` | Team lead (C-01) | Aditivo: **una línea** `app.use(...)` por router nuevo. |
| `src/application/ports/` | Team lead (C-01) | Solo puertos del núcleo (repos de configuración, pacientes, turnos, `Clock`, `Auditoria`). Los repos propios de un módulo viven **dentro de la zona del módulo**. |
| `src/infrastructure/` (repos en memoria, seed, clock) | Team lead (C-01) | Seed del núcleo. Los datos ficticios propios de un simulador viven en su carpeta (p. ej. `src/simulators/obras-sociales/padron.ts`). |
| `src/domain/agenda/turno.ts`, `src/domain/agenda/validarNuevoTurno.ts` | Team lead (C-02) | Solo lectura para el resto; cambios vía PR al team lead. |
| `src/api/routes/turnos.ts` | Team lead (C-02) | Aditivo por Integrante 1 (C-03, C-04): nuevas rutas al final del router. |
| `public/styles/tokens.css`, `public/js/api.js` | Team lead (C-01) | Solo lectura; tokens del prototipo. |

### Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Conflictos de merge en archivos compartidos (`app.ts`, puertos, seed, `turnos.ts`) | Alto | Zonas disjuntas por ficha; compartidos solo aditivos y revisados por el team lead; routers por módulo dentro de la zona del módulo; PR chicos y frecuentes; rebase antes de pedir review. |
| C-01/C-02 atrasados bloquean a 5 personas | Alto | El team lead los prioriza el día 1; el resto propone sus changes (OPSX) y arma maquetas estáticas mientras tanto; C-08 y C-07 arrancan con datos de C-01. |
| Crecimiento del alcance (bot y simuladores) | Alto | "Fuera de alcance" explícito por ficha; simuladores = una pantalla + un endpoint + datos fijos; nada de "etapas posteriores". Urgencia y "hablar con la doctora" del bot quedan fuera. |
| Plazo (2 días) | Alto | Changes de 2-4 h; C-13/C-14 solo si sobra tiempo; plan B del bot sin "reprogramar" (ver camino crítico). |
| Confundir simuladores con integraciones reales | Medio | Rótulo "SIMULACIÓN" obligatorio + test que verifica ausencia de llamadas de red (RN-SM-04). |
| Datos reales de pacientes | Alto | RN-DA-01; checklist en el PR; seeds con rangos claramente falsos. |
| Fechas y zona horaria (24 h, bloques de 15') | Medio | `Clock` inyectable y `TZ=America/Argentina/Buenos_Aires` desde C-01; tests con fechas fijas. |

---

## FASE 0 — Cimientos (Team lead, bloqueante)

### [C-01] `base-proyecto-y-modelo-dominio`
- **Estado**: `[x]` completado (2026-11-22) — archivado; handoff en `knowledge-base/entrega/C-01.md`
- **Responsable**: Team lead
- **Objetivo**: dejar el esqueleto ejecutable y el modelo de dominio base sobre el que trabajan las 6 personas.
- **Resultado**: `npm test` corre Vitest en verde, `npm run dev` levanta Express con `GET /api/health` y `GET /api/catalogo`, y los repos en memoria devuelven el seed ficticio.
- **Scope**:
  - Proyecto TypeScript + Node: `package.json` (scripts `dev`, `test`, `build`), `tsconfig.json`, `vitest.config.ts`, `supertest`; `README.md` con cómo correr en local.
  - `src/domain/shared/`: `Intervalo` `[inicio, fin)` con `seSolapan(a, b)`, validación de bloques de 15 min, tipo `Result<Ok, ErrorDeRegla>` con `{ regla, dimension?, conflicto? }`.
  - `src/domain/configuracion/`: tipos `Sillon`, `Prestacion` (una sola `duracionMin`, múltiplo de 15 — DD-12, RN-CF-01), `Profesional` con `disponibilidad: Franja[]`, `Bloqueo` (por profesional, sillón o global).
  - `src/domain/pacientes/`: tipo `Paciente` (DNI único, `telefono`, `obraSocialId?`, `nroAfiliado?`).
  - `src/application/ports/`: `SillonRepository`, `PrestacionRepository`, `ProfesionalRepository`, `BloqueoRepository`, `PacienteRepository`, `TurnoRepository` (`guardar`, `actualizar`, `buscarPorId`, `listarActivos(filtro)`), `Clock`, `Auditoria` (solo `registrar`).
  - `src/infrastructure/memory/`: implementaciones en memoria; `src/infrastructure/clock/` (`SIM_NOW`); `src/infrastructure/seed/`: 2 sillones, 2 profesionales lun-vie 9-13 y 14-19, prestaciones control 30 / ortodoncia 45 / tratamiento 60 / estética 60 / urgencia 30, ~10 pacientes ficticios, 1 bloqueo "reservado urgencias" diario, usuarios admin/recepción/2 odontólogos.
  - `src/api/app.ts` (`createApp(deps)`), `src/api/middleware/` (rol simulado por headers `X-Usuario`/`X-Rol`; mapeo de errores de regla → 409, input → 400, permiso → 403), `src/api/routes/catalogo.ts` (`GET /api/catalogo` → sillones, prestaciones, profesionales), `src/server.ts`.
  - `public/styles/tokens.css` (paleta/tipografías claro-oscuro del prototipo) y `public/js/api.js` (fetch con headers de rol).
  - Tests: `Intervalo` (contiguos no se solapan, parcial, contenido), alineación a 15', `GET /api/health`.
- **Fuera de alcance**: reglas de turnos (C-02), endpoints de alta/edición de configuración (C-07) y pacientes (C-08), cualquier UI de pantalla.
- **Reglas de negocio**: RN-AG-01 (base `Intervalo`), RN-AG-03 (bloques 15'), RN-CF-01, RN-DA-01, RN-DA-03.
- **Depende de**: ninguna
- **Gate de paralelismo**: GATE 0 → al mergear abre GATE 1.
- **Zona**: `package.json`, `tsconfig.json`, `vitest.config.ts`, `README.md`, `src/server.ts`, `src/api/app.ts`, `src/api/middleware/`, `src/api/routes/catalogo.ts`, `src/domain/shared/`, `src/domain/configuracion/`, `src/domain/pacientes/`, `src/application/ports/`, `src/infrastructure/`, `public/styles/`, `public/js/api.js`, `tests/domain/shared/`, `tests/api/health.test.ts`
- **Governance**: HIGH (ALTO) — cimiento compartido que todo lo demás referencia; el team lead lo revisa antes de mergear.
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Entidades, §Seed data inicial
  - `knowledge-base/08_arquitectura_propuesta.md` §Estructura de directorios, §Fronteras de módulo
  - `knowledge-base/02_descripcion_general.md` §Stack tecnológico, §API REST
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-03..DD-06, DD-09..DD-12
- **Criterios de aceptación (tests)**:
  - [ ] `seSolapan([9:00,9:30), [9:30,10:00))` → `false`; `seSolapan([9:00,10:00), [9:30,9:45))` → `true`.
  - [ ] Un inicio a las 9:10 no está alineado a bloques de 15'; 9:15 sí.
  - [ ] Una prestación con duración 20 es rechazada (RN-CF-01).
  - [ ] `GET /api/health` → 200; `GET /api/catalogo` devuelve 2 sillones, 2 profesionales y 5 prestaciones del seed.
  - [ ] El seed no contiene DNI/teléfonos fuera del rango ficticio.

### [C-02] `crear-turno-sin-solapamientos`
- **Estado**: `[x]` completado (2026-11-23) — archivado; handoff en `knowledge-base/entrega/C-02.md`
- **Responsable**: Team lead
- **Objetivo**: primer change OPSX obligatorio — crear un turno validando R1–R5 como función pura de dominio.
- **Resultado**: `POST /api/turnos` crea turnos válidos (201) y rechaza con 409 + regla + dimensión + turno en conflicto; la validación pura está cubierta por Vitest sin Express.
- **Scope**:
  - `src/domain/agenda/turno.ts`: `Turno` con `estado` (`reservado` al crear), `senado: false`, `esSobreturno: false`, `origen: 'recepcion' | 'whatsapp' | 'telefono'`, `creadoPor`, `creadoEn` (campos completos desde el inicio para que C-03..C-12 no editen el tipo).
  - `src/domain/agenda/validarNuevoTurno.ts` (puro): calcula `fin = inicio + duracionMin` (R3, RN-AG-11), alineación a 15' (R3), dentro de una franja del profesional y fuera de bloqueos de profesional/sillón/globales (R4), sin solapamiento con turnos activos del mismo profesional y del mismo sillón (R2, semántica R1), sin solapamiento con turnos activos del paciente (R5); ignora cancelados (RN-AG-10). Recibe la lista de turnos ya filtrada → reutilizable por reprogramar (C-04) excluyendo el propio turno.
  - `src/application/agenda/crearTurno.ts`: carga contexto de repos, valida, guarda y registra auditoría (RN-AU-01); permiso por rol (recepción/admin/paciente vía bot; odontólogo no crea).
  - `src/api/routes/turnos.ts`: `POST /api/turnos`, `GET /api/turnos?desde&hasta&profesionalId&sillonId`.
  - Tests: `tests/domain/agenda/validarNuevoTurno.test.ts` (back-to-back aceptado, parcial, contenido, mismo profesional distinto sillón, mismo sillón distinto profesional, fuera de franja, cruza el corte de almuerzo, en bloqueo, paciente doble, cancelado no ocupa, inicio no alineado), `tests/application/agenda/crearTurno.test.ts`, `tests/api/turnos.test.ts` (201/409/400/403).
- **Fuera de alcance**: sobreturno (C-13), cancelar/reprogramar/estados (C-03, C-04), huecos libres (C-05), UI.
- **Reglas de negocio**: RN-AG-01, RN-AG-02, RN-AG-03, RN-AG-04, RN-AG-05, RN-AG-10, RN-AG-11, RN-AG-12, RN-AU-01.
- **Depende de**: C-01
- **Gate de paralelismo**: GATE 1 → al mergear abre GATE 2 (fork principal).
- **Zona**: `src/domain/agenda/turno.ts`, `src/domain/agenda/validarNuevoTurno.ts`, `src/application/agenda/crearTurno.ts`, `src/api/routes/turnos.ts`, `tests/domain/agenda/validarNuevoTurno.test.ts`, `tests/application/agenda/crearTurno.test.ts`, `tests/api/turnos.test.ts`
- **Governance**: MEDIUM (MEDIO) — regla de dominio central; checkpoints con el equipo en el diseño del error 409.
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` §Agenda / Turnos (RN-AG-01..05, 10..12)
  - `knowledge-base/07_flujos_principales.md` §Flujo 1
  - `knowledge-base/06_funcionalidades.md` §US-010
  - `knowledge-base/04_modelo_de_datos.md` §Turno, §Intervalo
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-01, DD-06, DD-08, SU-06
- **Criterios de aceptación (tests)**:
  - [x] Control (30') a las 10:00 → `fin` 10:30 (R3).
  - [x] Turno que empieza 10:30 cuando otro del mismo profesional termina 10:30 → aceptado (R1).
  - [x] Solapamiento con el mismo profesional en otro sillón → 409 `RN-AG-02`, `dimension: "profesional"`, con el turno en conflicto.
  - [x] Solapamiento con el mismo sillón y otro profesional → 409 `RN-AG-02`, `dimension: "sillon"`.
  - [x] Turno que termina después de las 13:00 (corte de almuerzo) o cae en un bloqueo → 409 `RN-AG-04`.
  - [x] Paciente con turno superpuesto en otro profesional/sillón → 409 `RN-AG-05`.
  - [x] Un turno cancelado en el mismo horario no bloquea la creación (RN-AG-10).
  - [x] Inicio 10:10 → rechazo `RN-AG-03`.
  - [x] Cada alta genera un evento de auditoría con usuario, rol y fecha.

---

## FASE 1 — Ciclo de vida del turno (Integrante 1)

> C-03 y C-04 tocan `src/api/routes/turnos.ts` (aditivo); al ser del mismo responsable y secuenciales no generan conflicto entre sí.

### [C-03] `cambiar-estado-y-cancelar-turno`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 1
- **Objetivo**: transiciones de estado válidas (confirmar, atender, ausente, cancelar) con la ventana de 24 h del paciente.
- **Resultado**: los endpoints de estado aplican la máquina de estados y la regla de 24 h; un turno cancelado libera profesional y sillón.
- **Scope**:
  - `src/domain/agenda/estados.ts` (puro): transiciones `reservado → confirmado | cancelado | ausente | atendido`; `confirmado → cancelado | atendido | ausente`; finales `cancelado`, `atendido`, `ausente` (RN-AG-09).
  - `src/domain/agenda/ventanaCancelacion.ts` (puro): paciente puede cancelar hasta 24 h antes; recepción/admin siempre (RN-AG-06); usa `Clock` inyectado.
  - `src/application/agenda/cambiarEstadoTurno.ts`, `src/application/agenda/cancelarTurno.ts` (motivo + autor; auditoría RN-AU-01; emite evento interno `turnoLiberado` para C-14).
  - Rutas en `src/api/routes/turnos.ts`: `POST /api/turnos/:id/confirmar | atender | ausente | cancelar`.
  - Tests de dominio, aplicación y API.
- **Fuera de alcance**: notificar a la lista de espera (C-14 stretch; solo se emite el evento), reprogramar (C-04), UI.
- **Reglas de negocio**: RN-AG-06, RN-AG-09, RN-AG-10, RN-AU-01; permisos de `03_actores_y_roles.md` (odontólogo solo atender/ausente de sus turnos).
- **Depende de**: C-02
- **Gate de paralelismo**: GATE 2.
- **Zona**: `src/domain/agenda/estados.ts`, `src/domain/agenda/ventanaCancelacion.ts`, `src/application/agenda/cambiarEstadoTurno.ts`, `src/application/agenda/cancelarTurno.ts`, `tests/domain/agenda/estados.test.ts`, `tests/domain/agenda/ventanaCancelacion.test.ts`, `tests/application/agenda/cancelarTurno.test.ts`; compartido aditivo: `src/api/routes/turnos.ts`
- **Governance**: MEDIUM (MEDIO)
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-AG-06, RN-AG-09, RN-AG-10
  - `knowledge-base/07_flujos_principales.md` §Flujo 2
  - `knowledge-base/06_funcionalidades.md` §US-011, §US-013
  - `knowledge-base/03_actores_y_roles.md` §RBAC
- **Criterios de aceptación (tests)**:
  - [ ] `reservado → confirmado` ok; `atendido → cancelado` → 409 `RN-AG-09`.
  - [ ] Paciente cancela a 25 h → ok; a 23 h → rechazo `RN-AG-06`; recepción a 1 h → ok.
  - [ ] Tras cancelar, crear otro turno en el mismo horario/profesional/sillón → aceptado.
  - [ ] Cancelación guarda motivo, autor y evento de auditoría.
  - [ ] Odontólogo no puede cancelar (403).

### [C-04] `reprogramar-turno`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 1
- **Objetivo**: mover un turno a otro horario (y opcionalmente otro profesional/sillón) con la misma validación que crear.
- **Resultado**: `POST /api/turnos/:id/reprogramar` revalida R1–R5 excluyendo el propio turno y deja libre el horario anterior.
- **Scope**:
  - `src/application/agenda/reprogramarTurno.ts`: reutiliza `validarNuevoTurno` (C-02) pasando los turnos activos **sin** el propio; ventana de 24 h del paciente (reusa `ventanaCancelacion` de C-03); auditoría con antes/después; emite `turnoLiberado` con el horario anterior.
  - Ruta `POST /api/turnos/:id/reprogramar` en `src/api/routes/turnos.ts`.
  - Tests de aplicación y API.
- **Fuera de alcance**: cambios en `validarNuevoTurno` (si hiciera falta, PR al team lead), lista de espera, UI.
- **Reglas de negocio**: RN-AG-08, RN-AG-01..05, RN-AG-06 (ventana), RN-AU-01.
- **Depende de**: C-02, C-03
- **Gate de paralelismo**: GATE 3.
- **Zona**: `src/application/agenda/reprogramarTurno.ts`, `tests/application/agenda/reprogramarTurno.test.ts`, `tests/api/reprogramar.test.ts`; compartido aditivo: `src/api/routes/turnos.ts`
- **Governance**: MEDIUM (MEDIO)
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-AG-08
  - `knowledge-base/07_flujos_principales.md` §Flujo 3
  - `knowledge-base/06_funcionalidades.md` §US-012
- **Criterios de aceptación (tests)**:
  - [ ] Correr un turno 15' hacia adelante solapando consigo mismo → aceptado (se excluye el propio).
  - [ ] Mover a un horario ocupado por otro turno del mismo sillón → 409 `RN-AG-02`.
  - [ ] Mover fuera de la franja del profesional → 409 `RN-AG-04`.
  - [ ] Tras reprogramar, el horario anterior acepta un turno nuevo.
  - [ ] Auditoría registra antes/después; paciente a < 24 h → rechazo.

---

## FASE 2 — Motor de huecos y bot de WhatsApp SIMULADO (Integrante 2)

### [C-05] `calcular-huecos-libres`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 2
- **Objetivo**: calcular los horarios libres para una prestación/profesional/fecha con el mismo motor que valida la creación.
- **Resultado**: `GET /api/disponibilidad?prestacionId&profesionalId&fecha` devuelve solo inicios que `validarNuevoTurno` aceptaría.
- **Scope**:
  - `src/domain/agenda/huecos.ts` (puro): recorre las franjas del día en pasos de 15', descarta bloqueos y solapamientos de profesional/sillón; devuelve `{ inicio, fin, sillonId }[]`; probar contra `validarNuevoTurno` (consistencia).
  - `src/application/agenda/consultarHuecos.ts`; `src/api/routes/disponibilidad.ts` (router propio).
  - Tests de dominio y API.
- **Fuera de alcance**: UI, bot (C-06), huecos multi-día ("Ver más días" lo resuelve el bot llamando por fecha).
- **Reglas de negocio**: RN-AG-01..04, RN-AG-10, RN-WA-01.
- **Depende de**: C-02
- **Gate de paralelismo**: GATE 2.
- **Zona**: `src/domain/agenda/huecos.ts`, `src/application/agenda/consultarHuecos.ts`, `src/api/routes/disponibilidad.ts`, `tests/domain/agenda/huecos.test.ts`, `tests/api/disponibilidad.test.ts`; compartido aditivo: `src/api/app.ts` (1 línea)
- **Governance**: MEDIUM (MEDIO)
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §US-014
  - `knowledge-base/05_reglas_de_negocio.md` RN-AG-01..04, RN-WA-01
  - `knowledge-base/07_flujos_principales.md` §Flujo 4 paso 3, §Flujo 11
  - `knowledge-base/08_arquitectura_propuesta.md` §Patrones aplicados
- **Criterios de aceptación (tests)**:
  - [ ] Día sin turnos, tratamiento 60': el último hueco de la mañana empieza 12:00 (no 12:15).
  - [ ] Un turno 10:00-10:30 en ambos sillones elimina los huecos que lo solapan; 10:30 sigue libre (R1).
  - [ ] Bloqueo "reservado urgencias" no aparece como hueco.
  - [ ] Todo hueco devuelto es aceptado por `validarNuevoTurno` (test de propiedad sobre el seed).

### [C-06] `bot-whatsapp-simulado`
- **Estado**: `[x]` mergeado (PR #11) y archivado
- **Responsable**: Integrante 2
- **Objetivo**: chat SIMULADO del paciente que reserva, confirma, cancela y reprograma contra la agenda real.
- **Resultado**: desde `public/bot.html` un paciente ficticio reserva un turno que aparece en `GET /api/turnos` con `origen: "whatsapp"` y estado `reservado`; puede confirmarlo, cancelarlo o cambiarlo.
- **Scope**:
  - `src/simulators/whatsapp/conversacion.ts` (máquina de estados pura): menú (Pedir un turno / Ver o cambiar mi turno) → tipo de consulta → hasta 3 huecos + "Ver más días" → nombre y DNI → tarjeta "Turno reservado"; "Ver o cambiar mi turno" → Confirmo / Necesito cambiarlo / Cancelar turno.
  - `src/simulators/whatsapp/router.ts`: `POST /api/sim/whatsapp/mensaje` (paciente identificado por teléfono ficticio); invoca **los mismos casos de uso** que recepción: `consultarHuecos` (C-05), buscar/crear paciente (C-08), `crearTurno` (C-02), `cambiarEstadoTurno`/`cancelarTurno` (C-03), `reprogramarTurno` (C-04).
  - `public/bot.html`, `public/js/bot.js`: chat estilo prototipo con rótulo fijo **"Simulación — no es WhatsApp real"**; botón de demo "Enviar recordatorio 24 h" que muestra el mensaje y las 3 opciones.
  - Tests de la máquina de estados y de la ruta.
- **Fuera de alcance**: API real de WhatsApp/Meta, urgencia del día (US-053), "hablar con la doctora" (US-054), recordatorio automático por reloj, lista de espera.
- **Reglas de negocio**: RN-WA-01..04, RN-AG-06 (24 h), RN-SM-04, RN-DA-01/02.
- **Depende de**: C-03, C-04, C-05, C-08
- **Gate de paralelismo**: GATE 3 (puede empezar cuando C-05 y C-08 ✓; la opción "Necesito cambiarlo" se cablea al mergear C-04).
- **Zona**: `src/simulators/whatsapp/`, `public/bot.html`, `public/js/bot.js`, `tests/simulators/whatsapp/`; compartido aditivo: `src/api/app.ts` (1 línea)
- **Governance**: LOW (BAJO) — simulador; la lógica de negocio vive en los casos de uso que invoca.
- **Leer antes**:
  - `knowledge-base/07_flujos_principales.md` §Flujo 4, §Flujo 5
  - `knowledge-base/05_reglas_de_negocio.md` §Bot WhatsApp simulado (RN-WA)
  - `knowledge-base/06_funcionalidades.md` §Épica 6
  - `docs/discovery/prototipo/agenda_odontologia.html` (referencia visual)
- **Criterios de aceptación (tests)**:
  - [ ] Los horarios ofrecidos son exactamente los primeros 3 de `consultarHuecos` (nunca lista estática).
  - [ ] Completar el flujo crea un turno `reservado` con `origen: "whatsapp"`.
  - [ ] "Confirmo" pasa el turno a `confirmado`; "Cancelar turno" a < 24 h responde "comunicate con recepción" y no cancela.
  - [ ] Elegir un hueco que otro tomó entre medio → el bot informa y vuelve a ofrecer.
  - [ ] La respuesta HTML contiene el rótulo "Simulación"; el módulo no hace requests de red salientes.

---

## FASE 3 — Configuración y pacientes (Integrante 3)

> C-08 primero (lo necesita el bot, C-06). Ambos pueden arrancar apenas C-01 ✓ (no dependen de turnos, salvo los tests de RN-CF-04).

### [C-07] `configurar-agenda-del-consultorio`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 3
- **Objetivo**: que el administrador configure sillones, prestaciones, disponibilidad de profesionales y bloqueos por API.
- **Resultado**: endpoints de configuración validan RN-CF-01..04 y lo cargado se refleja en la validación de turnos.
- **Scope**:
  - `src/application/configuracion/`: `crearSillon`, `desactivarSillon`, `crearPrestacion` / `actualizarPrestacion`, `definirDisponibilidad` (franjas sin superposición, alineadas a 15'), `crearBloqueo` / `eliminarBloqueo`.
  - `src/api/routes/configuracion.ts`: `POST /api/sillones`, `POST /api/prestaciones`, `PUT /api/prestaciones/:id`, `PUT /api/profesionales/:id/disponibilidad`, `GET/POST/DELETE /api/bloqueos`.
  - Permisos: admin todo; recepción bloqueos; odontólogo bloqueos propios (RN-CF-03).
  - Tests de aplicación y API.
- **Fuera de alcance**: pantalla de administración (la demo usa el seed), duración por profesional (DD-12), reglas de autogestión configurables (US-090).
- **Reglas de negocio**: RN-CF-01, RN-CF-02, RN-CF-03, RN-CF-04, RN-AG-04.
- **Depende de**: C-01
- **Gate de paralelismo**: GATE 1 (en paralelo con C-02).
- **Zona**: `src/application/configuracion/`, `src/api/routes/configuracion.ts`, `tests/application/configuracion/`, `tests/api/configuracion.test.ts`; compartido aditivo: `src/api/app.ts` (1 línea)
- **Governance**: MEDIUM (MEDIO)
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` §Configuración (RN-CF)
  - `knowledge-base/06_funcionalidades.md` §Épica 1
  - `knowledge-base/07_flujos_principales.md` §Flujo 11
  - `knowledge-base/03_actores_y_roles.md` §RBAC
- **Criterios de aceptación (tests)**:
  - [ ] Prestación de 20' → 400/409 `RN-CF-01`; de 45' → creada.
  - [ ] Franjas lunes 9-13 y 12-15 → rechazo `RN-CF-02`.
  - [ ] Recepcionista que intenta crear un sillón → 403.
  - [ ] Desactivar un sillón conserva sus turnos e impide crear nuevos (RN-CF-04).

### [C-08] `ficha-paciente-y-cobertura-obra-social-sim`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 3
- **Objetivo**: ficha mínima de paciente y consulta SIMULADA de cobertura por número de afiliado.
- **Resultado**: `POST/GET /api/pacientes` funciona con DNI único y `GET /api/sim/obras-sociales/afiliados/:nro` devuelve cobertura y % de copago del padrón ficticio.
- **Scope**:
  - `src/application/pacientes/`: `registrarPaciente`, `buscarPorDni`, `buscarOCrearPorTelefono` (lo usa el bot).
  - `src/api/routes/pacientes.ts`: `GET/POST /api/pacientes`, `GET /api/pacientes/:id`.
  - `src/simulators/obras-sociales/`: `padron.ts` (3-4 obras sociales ficticias, p. ej. "OS Ficticia Salud", "Prepaga Demo", con plan, cobertura y `copagoPct`) y `router.ts`.
  - `public/sim/obras-sociales.html`: una pantalla con input de nº de afiliado y rótulo **"SIMULACIÓN"**.
  - Tests.
- **Fuera de alcance**: padrones reales, validación online, nomenclador, liquidaciones, historia clínica.
- **Reglas de negocio**: RN-DA-01, RN-SM-02, RN-SM-04, RN-DA-02.
- **Depende de**: C-01
- **Gate de paralelismo**: GATE 1 (en paralelo con C-02).
- **Zona**: `src/application/pacientes/`, `src/api/routes/pacientes.ts`, `src/simulators/obras-sociales/`, `public/sim/obras-sociales.html`, `tests/application/pacientes/`, `tests/simulators/obras-sociales/`; compartido aditivo: `src/api/app.ts` (2 líneas)
- **Governance**: MEDIUM (MEDIO) para pacientes (datos personales, aunque ficticios); LOW (BAJO) para el simulador.
- **Leer antes**:
  - `knowledge-base/04_modelo_de_datos.md` §Paciente, §Simuladores
  - `knowledge-base/06_funcionalidades.md` §US-030, §US-061
  - `knowledge-base/07_flujos_principales.md` §Flujo 8
  - `knowledge-base/05_reglas_de_negocio.md` RN-SM-02, RN-DA-01
- **Criterios de aceptación (tests)**:
  - [ ] Registrar dos pacientes con el mismo DNI → 409.
  - [ ] Afiliado existente del padrón → obra social, plan, cobertura y `copagoPct`.
  - [ ] Afiliado inexistente → 404 "afiliado no encontrado".
  - [ ] La pantalla muestra "SIMULACIÓN"; el simulador no hace requests de red.

---

## FASE 4 — Interfaz de agenda y odontograma (Integrante 4)

### [C-09] `vista-agenda-y-registro-del-sistema`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 4
- **Objetivo**: agenda diaria y semanal filtrable por profesional y por sillón, con el panel "Lo que hizo el sistema".
- **Resultado**: `public/index.html` muestra los turnos de `GET /api/turnos` en grilla de 15', con filtros y un panel de registro alimentado por `GET /api/registro`.
- **Scope**:
  - `public/index.html`, `public/js/agenda.js`: grilla días × horarios (bloques de 15'), vista día/semana, filtros profesional y sillón, colores por prestación, estado visible ("Sin confirmar", "Confirmó", "Atendido"), ícono de origen WhatsApp, horarios pasados atenuados, selector de rol simulado; formulario mínimo "Nuevo turno" que llama `POST /api/turnos` y muestra el error 409 con el conflicto.
  - `src/application/auditoria/`: `listarAuditoria` (solo lectura), `registroLegible` (traduce eventos a frases tipo "Turno creado: …").
  - `src/api/routes/auditoria.ts`: `GET /api/auditoria` (admin/recepción), `GET /api/registro`.
  - Tests de API de auditoría/registro (la UI se verifica manualmente en la demo).
- **Fuera de alcance**: indicadores/KPIs (opcional, excluido), lista de espera en UI, edición o borrado de auditoría (RN-AU-02), pantallas del bot y simuladores.
- **Reglas de negocio**: RN-AU-01, RN-AU-02, RN-AG-03 (bloques 15'), RN-DA-03.
- **Depende de**: C-02
- **Gate de paralelismo**: GATE 2 (puede maquetar estático desde GATE 0).
- **Zona**: `public/index.html`, `public/js/agenda.js`, `src/application/auditoria/`, `src/api/routes/auditoria.ts`, `tests/api/auditoria.test.ts`; compartido aditivo: `src/api/app.ts` (1 línea)
- **Governance**: LOW (BAJO) — UI y lectura; la auditoría es de solo lectura (no agregar escritura ni borrado).
- **Leer antes**:
  - `knowledge-base/06_funcionalidades.md` §US-020, §US-022, §US-041
  - `knowledge-base/04_modelo_de_datos.md` §Turno (mapeo de estados del prototipo), §Registro del sistema
  - `knowledge-base/10_preguntas_abiertas.md` IN-05
  - `docs/discovery/prototipo/agenda_odontologia.html`
- **Criterios de aceptación (tests)**:
  - [ ] `GET /api/auditoria` con rol odontólogo → 403; con recepción → eventos en orden cronológico.
  - [ ] Crear un turno genera una línea "Turno creado: …" en `GET /api/registro`.
  - [ ] No existe ruta de escritura/borrado de auditoría.
  - [ ] (Manual, demo) filtrar por "Sillón 2" muestra solo sus turnos; un 409 muestra el turno en conflicto.

### [C-10] `odontograma-donde-te-duele`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 4
- **Objetivo**: odontograma FDI donde el paciente toca la pieza que le duele y la agrega a su turno.
- **Resultado**: `PUT /api/turnos/:id/piezas` guarda piezas FDI válidas con síntomas y `public/odontograma.html` las muestra en rojo (a revisar) / azul (hecho).
- **Scope**:
  - `src/domain/odontograma/` (puro): piezas FDI permanentes (18-11, 21-28, 31-38, 48-41), nombres ("16 · Primer molar superior derecho"), 5 caras, síntomas, estado `a_revisar | hecho`.
  - `src/application/odontograma/`: `agregarPiezaAlTurno`, `marcarHecho` (odontólogo); repositorio de piezas propio en la zona.
  - `src/api/routes/odontograma.ts`: `PUT /api/turnos/:id/piezas`, `GET /api/turnos/:id/piezas` (router propio, no edita `turnos.ts`).
  - `public/odontograma.html`, `public/js/odontograma.js`: 4 cuadrantes, panel con nombre y síntomas, botón "Agregar pieza N al turno"; referencia `odontograma-referencia.png`.
  - Tests.
- **Fuera de alcance**: historia clínica, planes de tratamiento, presupuestos, odontograma de dientes temporales.
- **Reglas de negocio**: RN-OD-01..04, RN-DA-01.
- **Depende de**: C-02
- **Gate de paralelismo**: GATE 2/3 (independiente del resto).
- **Zona**: `src/domain/odontograma/`, `src/application/odontograma/`, `src/api/routes/odontograma.ts`, `public/odontograma.html`, `public/js/odontograma.js`, `tests/domain/odontograma/`, `tests/api/odontograma.test.ts`; compartido aditivo: `src/api/app.ts` (1 línea)
- **Governance**: LOW (BAJO) — simulador visual del MVP (ajuste 6.4).
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` §Odontograma (RN-OD)
  - `knowledge-base/04_modelo_de_datos.md` §PiezaMarcada
  - `knowledge-base/07_flujos_principales.md` §Flujo 10
  - `docs/discovery/prototipo/odontograma-referencia.png`
- **Criterios de aceptación (tests)**:
  - [ ] Pieza 16 → nombre "Primer molar superior derecho"; pieza 19 o 51 → rechazo.
  - [ ] Agregar pieza 36 con "dolor al masticar" a un turno → queda `a_revisar`.
  - [ ] Odontólogo marca `hecho`; paciente no puede marcar `hecho` (403).
  - [ ] Hay exactamente 32 piezas en 4 cuadrantes.

---

## FASE 5 — Simuladores de cobro (Integrante 5)

### [C-11] `pagar-sena-mercadopago-sim`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 5
- **Objetivo**: "pagar seña" con una pantalla de pago falsa que aprueba o rechaza.
- **Resultado**: aprobar marca el turno `senado: true`; rechazar no cambia el turno; todo rotulado "SIMULACIÓN".
- **Scope**:
  - `src/simulators/mercadopago/`: `pagarSena` (solo turnos `reservado`/`confirmado` — SU-07), `PagoSena` con `simulado: true`, repositorio en memoria propio, `router.ts` (`POST /api/sim/mercadopago/pagos` con `{ turnoId, resultado: 'aprobado' | 'rechazado' }`). Actualiza el turno vía `TurnoRepository.actualizar` (puerto de C-01).
  - `public/sim/mercadopago.html`: pantalla falsa con botones Aprobar / Rechazar y rótulo **"SIMULACIÓN — no es Mercado Pago real"**.
  - Tests.
- **Fuera de alcance**: SDK/API real de Mercado Pago, credenciales, webhooks, reembolsos, estado "señado" como estado nuevo (es una marca — IN-04).
- **Reglas de negocio**: RN-SM-01, RN-SM-04, RN-DA-02; IN-04.
- **Depende de**: C-02
- **Gate de paralelismo**: GATE 2.
- **Zona**: `src/simulators/mercadopago/`, `public/sim/mercadopago.html`, `tests/simulators/mercadopago/`; compartido aditivo: `src/api/app.ts` (1 línea)
- **Governance**: LOW (BAJO) — simulador sin dinero ni credenciales.
- **Leer antes**:
  - `knowledge-base/07_flujos_principales.md` §Flujo 7
  - `knowledge-base/05_reglas_de_negocio.md` RN-SM-01, RN-SM-04
  - `knowledge-base/10_preguntas_abiertas.md` IN-04
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-02, SU-07
- **Criterios de aceptación (tests)**:
  - [ ] Pago aprobado sobre turno `reservado` → `senado: true` y registro del pago.
  - [ ] Pago rechazado → el turno no cambia.
  - [ ] Pago sobre turno `cancelado` → 409.
  - [ ] El módulo no realiza requests de red; la pantalla muestra "SIMULACIÓN".

### [C-12] `emitir-factura-c-arca-sim`
- **Estado**: `[ ]` pendiente
- **Responsable**: Integrante 5
- **Objetivo**: emitir una "Factura C" con CAE ficticio y mostrarla como comprobante.
- **Resultado**: `POST /api/sim/arca/facturas` sobre un turno `atendido` devuelve número correlativo, CAE ficticio y vencimiento; la pantalla dice "SIMULACIÓN — sin validez fiscal".
- **Scope**:
  - `src/simulators/arca/`: `emitirFacturaC` (solo turnos `atendido` — SU-07), numeración correlativa, CAE ficticio de 14 dígitos generado de forma determinística, `FacturaC` con `simulado: true`, repositorio propio, `router.ts`.
  - `public/sim/arca.html`: comprobante imprimible con rótulo **"SIMULACIÓN — sin validez fiscal"**.
  - Tests (el turno `atendido` se arma directo en el repo en memoria; no requiere C-03 para testear).
- **Fuera de alcance**: web services reales de ARCA/AFIP, certificados, Factura A/B, notas de crédito.
- **Reglas de negocio**: RN-SM-03, RN-SM-04, RN-DA-02; SU-07.
- **Depende de**: C-02
- **Gate de paralelismo**: GATE 2/3 (para la demo de punta a punta conviene C-03 ✓, que permite marcar `atendido`).
- **Zona**: `src/simulators/arca/`, `public/sim/arca.html`, `tests/simulators/arca/`; compartido aditivo: `src/api/app.ts` (1 línea)
- **Governance**: LOW (BAJO) — simulador sin validez fiscal.
- **Leer antes**:
  - `knowledge-base/07_flujos_principales.md` §Flujo 9
  - `knowledge-base/05_reglas_de_negocio.md` RN-SM-03, RN-SM-04
  - `knowledge-base/04_modelo_de_datos.md` §Simuladores
  - `knowledge-base/09_decisiones_y_supuestos.md` DD-02, SU-07
- **Criterios de aceptación (tests)**:
  - [ ] Emitir sobre turno `atendido` → factura con número, CAE y `simulado: true`.
  - [ ] Emitir sobre turno `reservado` → 409.
  - [ ] Dos emisiones consecutivas tienen números correlativos.
  - [ ] Sin requests de red; la pantalla muestra "sin validez fiscal".

---

## FASE 6 — Opcionales (stretch, sin responsable)

> Solo si los 12 changes asignados están mergeados antes de la entrega. Quien termine primero los toma, avisando en el canal del equipo.

### [C-13] `sobreturno-explicito`
- **Estado**: `[ ]` pendiente (opcional / stretch)
- **Responsable**: sin asignar (stretch)
- **Objetivo**: permitir un turno superpuesto solo con marca de sobreturno y rol recepción/admin.
- **Resultado**: `POST /api/turnos` con `sobreturno: true` exime RN-AG-02 únicamente, marca `esSobreturno` y audita.
- **Scope**: parámetro `sobreturno` en `crearTurno`; regla de rol (odontólogo/paciente → 403 `RN-AG-07`); R3, R4 y R5 siguen aplicando (SU-06 confirmado); evento de auditoría `sobreturno`; tests.
- **Fuera de alcance**: sobreturno desde el bot.
- **Reglas de negocio**: RN-AG-07, RN-AG-03..05, RN-AU-01; SU-06.
- **Depende de**: C-02
- **Gate de paralelismo**: GATE 2.
- **Zona**: `src/domain/agenda/sobreturno.ts`, `tests/domain/agenda/sobreturno.test.ts`; compartido (PR al team lead): `src/application/agenda/crearTurno.ts`
- **Governance**: MEDIUM (MEDIO)
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` RN-AG-07
  - `knowledge-base/09_decisiones_y_supuestos.md` SU-06
  - `knowledge-base/06_funcionalidades.md` §US-042
- **Criterios de aceptación (tests)**:
  - [ ] Recepción con `sobreturno: true` sobre profesional ocupado → 201, `esSobreturno: true`, evento auditado.
  - [ ] Odontólogo con `sobreturno: true` → 403 `RN-AG-07`.
  - [ ] Sobreturno fuera de horario → 409 `RN-AG-04`; paciente con turno superpuesto → 409 `RN-AG-05`.

### [C-14] `lista-de-espera-ofrece-huecos`
- **Estado**: `[ ]` pendiente (opcional / stretch)
- **Responsable**: sin asignar (stretch)
- **Objetivo**: al liberarse un horario, ofrecerlo al paciente en espera compatible más antiguo.
- **Resultado**: al cancelar un turno, `GET /api/registro` muestra "Lista de espera: se ofreció el turno a …" y aceptar crea el turno con validación completa.
- **Scope**: `src/domain/lista-espera/` (compatibilidad prestación/profesional/duración, orden por antigüedad), `src/application/lista-espera/` (suscripción al evento `turnoLiberado` de C-03/C-04, aceptar → `crearTurno`), `src/api/routes/lista-espera.ts` (`GET/POST /api/lista-espera`); tests.
- **Fuera de alcance**: ofrecimiento por WhatsApp real, UI dedicada.
- **Reglas de negocio**: RN-LE-01..03, RN-AG-06.
- **Depende de**: C-03
- **Gate de paralelismo**: GATE 3.
- **Zona**: `src/domain/lista-espera/`, `src/application/lista-espera/`, `src/api/routes/lista-espera.ts`, `tests/domain/lista-espera/`
- **Governance**: MEDIUM (MEDIO)
- **Leer antes**:
  - `knowledge-base/05_reglas_de_negocio.md` §Lista de espera (RN-LE)
  - `knowledge-base/07_flujos_principales.md` §Flujo 2
  - `knowledge-base/06_funcionalidades.md` §US-080
- **Criterios de aceptación (tests)**:
  - [ ] Cancelar un control libera el hueco y se ofrece al paciente en espera más antiguo compatible.
  - [ ] Si el hueco fue tomado antes de aceptar → se informa y no se crea turno (RN-LE-02).

---

## Resumen

| # | Slug | Responsable | Zona principal | Depende de | Governance |
|---|---|---|---|---|---|
| C-01 | `base-proyecto-y-modelo-dominio` | Team lead | `src/domain/shared/`, `src/domain/configuracion/`, `src/application/ports/`, `src/infrastructure/`, `src/api/app.ts` | ninguna | HIGH |
| C-02 | `crear-turno-sin-solapamientos` | Team lead | `src/domain/agenda/` (turno, validarNuevoTurno), `src/api/routes/turnos.ts` | C-01 | MEDIUM |
| C-03 | `cambiar-estado-y-cancelar-turno` | Integrante 1 | `src/domain/agenda/estados.ts`, `src/application/agenda/cancelarTurno.ts` | C-02 | MEDIUM |
| C-04 | `reprogramar-turno` | Integrante 1 | `src/application/agenda/reprogramarTurno.ts` | C-02, C-03 | MEDIUM |
| C-05 | `calcular-huecos-libres` | Integrante 2 | `src/domain/agenda/huecos.ts`, `src/api/routes/disponibilidad.ts` | C-02 | MEDIUM |
| C-06 | `bot-whatsapp-simulado` | Integrante 2 | `src/simulators/whatsapp/`, `public/bot.html` | C-03, C-04, C-05, C-08 | LOW |
| C-07 | `configurar-agenda-del-consultorio` | Integrante 3 | `src/application/configuracion/`, `src/api/routes/configuracion.ts` | C-01 | MEDIUM |
| C-08 | `ficha-paciente-y-cobertura-obra-social-sim` | Integrante 3 | `src/application/pacientes/`, `src/simulators/obras-sociales/` | C-01 | MEDIUM / LOW |
| C-09 | `vista-agenda-y-registro-del-sistema` | Integrante 4 | `public/index.html`, `src/application/auditoria/` | C-02 | LOW |
| C-10 | `odontograma-donde-te-duele` | Integrante 4 | `src/domain/odontograma/`, `public/odontograma.html` | C-02 | LOW |
| C-11 | `pagar-sena-mercadopago-sim` | Integrante 5 | `src/simulators/mercadopago/`, `public/sim/mercadopago.html` | C-02 | LOW |
| C-12 | `emitir-factura-c-arca-sim` | Integrante 5 | `src/simulators/arca/`, `public/sim/arca.html` | C-02 | LOW |
| C-13 | `sobreturno-explicito` (stretch) | sin asignar | `src/domain/agenda/sobreturno.ts` | C-02 | MEDIUM |
| C-14 | `lista-de-espera-ofrece-huecos` (stretch) | sin asignar | `src/domain/lista-espera/`, `src/application/lista-espera/` | C-03 | MEDIUM |

**Excluido a propósito** (etapas posteriores, `informe-discovery.md` §6.3): WhatsApp Business API real, Mercado Pago real, padrones reales de obras sociales, ARCA real, historia clínica completa/presupuestos, multisucursal, reportes de ocupación y ausentismo, Google Calendar/API pública. **Opcionales no incluidos**: indicadores/KPIs (US-021) y reglas de autogestión configurables (US-090); urgencia y "hablar con la doctora" del bot (US-053, US-054).

**Primer item elegible**: `C-01` (`base-proyecto-y-modelo-dominio`), seguido del primer change OPSX `C-02` (`crear-turno-sin-solapamientos`).
