# C-08 — Relevamiento (fase Explore)

- **Fecha**: 2026-11-24
- **Rama**: `C-08-ficha-paciente-y-cobertura-obra-social-sim`, creada desde `master` actualizado (`48bc1e5` tras `fetch` + `pull`).
- **Change**: `ficha-paciente-y-cobertura-obra-social-sim` — ficha en `CHANGES.md:354-380`.
- **Dependencias**: C-01 ✓ (ya mergeado). GATE 1: arranca en paralelo con C-02.
- **Estado previo**: `C-07-configurar-agenda` estaba limpio (`nothing to commit, working tree clean`) antes del cambio de rama.
- **Naturaleza de este documento**: solo relevamiento. No implementa ni fija una spec aprobada; las decisiones abiertas se resuelven en `Propose`.

## 1. Objetivo y alcance de la ficha

- **Resultado**: `POST/GET /api/pacientes` con DNI único y `GET /api/sim/obras-sociales/afiliados/:nro` devolviendo cobertura y `% de copago` del padrón ficticio (`CHANGES.md:358`).
- **Scope**: `src/application/pacientes/` (`registrarPaciente`, `buscarPorDni`, `buscarOCrearPorTelefono` — este último lo usa el bot C-06), `src/api/routes/pacientes.ts`, `src/simulators/obras-sociales/` (`padron.ts`, `router.ts`), `public/sim/obras-sociales.html` con rótulo **SIMULACIÓN**, y tests (`CHANGES.md:359-364`).
- **Fuera de alcance**: padrones reales, validación online, nomenclador, liquidaciones, historia clínica (`CHANGES.md:365`).
- **Zona**: `src/application/pacientes/`, `src/api/routes/pacientes.ts`, `src/simulators/obras-sociales/`, `public/sim/obras-sociales.html`, `tests/application/pacientes/`, `tests/simulators/obras-sociales/`; compartido aditivo: `src/api/app.ts` (2 líneas) (`CHANGES.md:369`).
- **Governance**: MEDIUM para pacientes, LOW para el simulador (`CHANGES.md:370`).

## 2. Qué existe hoy

### 2.1 Knowledge base

- `knowledge-base/04_modelo_de_datos.md:58-60`: `Paciente` = `id`, `nombre: string`, `dni: string` (ficticio), `telefono: string` (ficticio, identifica al paciente en el bot), `email?`, `obraSocialId?`, `nroAfiliado?`; constraint `dni` único.
- `knowledge-base/04_modelo_de_datos.md:88-92,101`: `ObraSocial (sim)` = `id`, `nombre` ficticio, `planes`, padrón `{ nroAfiliado, pacienteNombre, plan, cobertura, copagoPct }`; seed de 3-4 obras sociales ficticias ("OS Ficticia Salud", "Prepaga Demo").
- `knowledge-base/06_funcionalidades.md:82-86`: US-030 (ficha mínima; solo datos ficticios, DNI único). `06_funcionalidades.md:122-128`: US-061 (consultar cobertura por nº de afiliado).
- `knowledge-base/07_flujos_principales.md:87-90`: Flujo 8, dos pasos; inexistente → "no encontrado".
- `knowledge-base/03_actores_y_roles.md:19-20,39`: `Pacientes (ficha mínima)` → admin CRUD, recepcionista CRU, odontólogo R, paciente C/R propio; `Cobertura obra social (simulado)` → R para los cuatro roles. Autenticación simulada por `X-Usuario` / `X-Rol`.
- `knowledge-base/09_decisiones_y_supuestos.md`: DD-02 (simuladores internos y ficticios), DD-03 (repos en memoria), DD-04 (dominio puro, reloj inyectado), DD-08 (409 con `{ regla, dimension, conflicto }`), DD-09 (selector de rol con autorización testeada), DD-10 (nunca datos reales), DD-11 (entrega local 2026-11-24, simuladores mínimos).
- `knowledge-base/10_preguntas_abiertas.md`: no hay preguntas Alta/Media pendientes que bloqueen C-08. La única sobre padrones es de prioridad Baja (validación real post-MVP) y queda fuera de alcance.
- `knowledge-base/entrega/C-01.md:11-14`: dominio con `Paciente`, puerto `PacienteRepository`, seed de ~10 pacientes con DNI `99xxxxxx`; GATE 1 habilita C-07 y C-08.
- No existe `knowledge-base/entrega/C-08.md` (sí C-01, C-02, C-03, C-05, C-11).

### 2.2 `src/`

- **Ya existe**: `src/domain/pacientes/paciente.ts:1-8` con solo `id`, `nombre`, `dni`, `telefono` (sin `obraSocialId`/`nroAfiliado`/`email`).
- **Ya existe**: `src/application/ports/repositorios.ts:37-42` (`guardar`, `buscarPorId`, `buscarPorDni`, `listar`) y `src/infrastructure/memory/paciente-repository.ts:5-42`; `guardar` ya rechaza DNI duplicado con `regla: 'DNI_DUPLICADO'`, `dimension: 'paciente'` (`:15-22`) y usa `structuredClone` para copias defensivas.
- **Ya existe**: 10 pacientes ficticios en `src/infrastructure/seed/datos-seed.ts:48-61` (`pac-01..pac-10`, DNI `99000001..99000010`, teléfonos `+54 9 11 0000-00NN`); `Deps.pacientes` declarado en `src/api/deps.ts:19`.
- **Ya existe**: `Result`/`ok`/`fallo`/`ErrorDeRegla` en `src/domain/shared/result.ts:1-20`; `Clock`/`RelojFijo`; middleware `rol-simulado.ts` y `errores.ts` (409/400/403/404); factory de routers `xxxRouter(deps: Deps)`.
- **Ya existe como plantilla**: `src/simulators/mercadopago/` (4 archivos) — dominio puro con `AVISO_SIMULACION` y `simulado: true` (`pagoSena.ts:9,16-23`), puerto/repo propio fuera de `Deps` (`pagoSenaRepository.ts`), caso de uso con `tipo: 'permiso' | 'entrada' | 'no-encontrado' | 'regla'` (`pagarSena.ts`) y router bajo `/api/sim/...` con `aviso` (`router.ts`).
- **NO existe**: `src/application/pacientes/`, `src/api/routes/pacientes.ts`, `src/simulators/obras-sociales/`, `src/simulators/whatsapp/`, campos de cobertura en `Paciente`, ni una sola ocurrencia de `afiliado`, `obraSocial`, `copago`, `padron` en `src/`.
- **Observación**: `src/api/app.ts:22-25` monta catálogo, turnos, disponibilidad y Mercado Pago; no monta pacientes. `odontogramaRouter` se importa en `:9` pero no se monta y `auditoriaRouter` no se importa (fuera de la Zona de C-08; solo contextual).

### 2.3 `tests/`

- 31 archivos `*.test.ts`; Vitest en modo `node`, `include: ['tests/**/*.test.ts']`, `TZ: America/Argentina/Buenos_Aires` (`vitest.config.ts:1-9`). Sin `setupFiles` ni helpers compartidos: cada archivo arma sus propios fixtures.
- Convención dominante: títulos `dado ... cuando ... entonces ...` en español (`tests/application/agenda/crearTurno.test.ts:28`); imports explícitos de `describe/it/expect`; repositorios en memoria reales y `RelojFijo` con fecha fija (nunca se mockea el dominio).
- **Único test de DNI duplicado**: `tests/infrastructure/paciente-repository.test.ts:19-26`, a nivel repositorio (`DNI_DUPLICADO`), sin HTTP.
- **Plantillas de API**: `tests/api/turnos.test.ts:51-65` (409 con `error.regla`/`dimension`/`conflicto`), `:88-107` (400), `:157-170` (403); `tests/api/estadosTurno.test.ts:78-82` (404); `tests/api/errores.test.ts:25-42` (mapeo central).
- **Plantillas de simulador**: `tests/simulators/mercadopago/api.test.ts` (body con `simulado: true` + `aviso`), `pantalla.test.ts:9-41` (rótulo, `fetch` solo relativo, sin URLs externas) y `sin-red.test.ts:39-89` (spies sobre `fetch`/`http`/`https`/`net` + escaneo estático del fuente).
- **NO existe**: `tests/application/pacientes/`, `tests/simulators/obras-sociales/`, `tests/api/pacientes.test.ts`, ni tests de afiliado, cobertura, copago o padrón.

## 3. Reglas que aplican

| Regla / decisión | Fuente | Implicancia para C-08 |
|---|---|---|
| RN-DA-01 | `05_reglas_de_negocio.md:63` | Solo datos ficticios en código, seeds, tests y UI. Mantener el rango `99xxxxxx` del seed. |
| RN-DA-02 | `05_reglas_de_negocio.md:64` | Rótulo "SIMULACIÓN" en pantalla y documentación/respuesta. |
| RN-SM-02 | `05_reglas_de_negocio.md:45` | Afiliado del padrón → cobertura y `% de copago`; inexistente → "afiliado no encontrado". |
| RN-SM-04 | `05_reglas_de_negocio.md:47` | Cero llamadas de red y cero credenciales reales. |
| Constraint DNI único | `04_modelo_de_datos.md:60`, `06_funcionalidades.md:86` | 409 al registrar duplicado (criterio `CHANGES.md:377`). |
| DD-03 / DD-04 | `09_decisiones_y_supuestos.md:20,26` | Repos en memoria detrás de interfaz; dominio puro, sin `Date.now()`. |
| DD-08 | `09_decisiones_y_supuestos.md:50` | Error 409 con `{ regla, dimension, conflicto }` (ya implementado en `errores.ts:41-53`). |
| DD-09 + RBAC | `09_decisiones_y_supuestos.md:54`, `03_actores_y_roles.md:19-20,39` | Alta/edición de pacientes: admin + recepción; lectura de cobertura: los cuatro roles. |
| RN-AU-01 | `05_reglas_de_negocio.md:58` | Cubre altas de **turno**, no de paciente: no agregar auditoría sin spec. |

## 4. Qué falta implementar (por Zona)

1. `src/application/pacientes/`: `registrarPaciente` (validar entrada + rol, delegar DNI único al repo, devolver `Result` con `tipo: 'permiso' | 'entrada' | 'regla'`), `buscarPorDni` y `buscarOCrearPorTelefono` para C-06.
2. `src/api/routes/pacientes.ts`: `POST /api/pacientes`, `GET /api/pacientes`, `GET /api/pacientes/:id`, con `ErrorDeEntrada` → 400, `FalloDeRegla` → 409 y `no-encontrado` → 404.
3. `src/simulators/obras-sociales/padron.ts`: dominio puro con 3-4 obras sociales ficticias, `planes`, `cobertura`, `copagoPct`, constante de aviso y búsqueda por `nroAfiliado`.
4. `src/simulators/obras-sociales/router.ts`: `GET /api/sim/obras-sociales/afiliados/:nro`, con `simulado: true` y `aviso`, sin repo global ni red.
5. `public/sim/obras-sociales.html`: input de nº de afiliado, banner **SIMULACIÓN**, `fetch` solo a la ruta local; misma estética que `public/sim/mercadopago.html`.
6. `src/api/app.ts`: dos líneas aditivas para montar ambos routers (coordinar con team lead).
7. Tests nuevos: `tests/application/pacientes/` (alta, duplicado, búsqueda por DNI/teléfono), `tests/simulators/obras-sociales/` (padrón, API 404/éxito, pantalla, sin red) y la prueba HTTP de 409 para `/api/pacientes` (ver decisión 6).

## 5. Criterios de aceptación — estado actual

| Criterio (`CHANGES.md:376-380`) | Estado |
|---|---|
| Dos pacientes con el mismo DNI → 409 | Parcial: `DNI_DUPLICADO` ya existe en el repo y el middleware ya mapea a 409, pero falta el caso de uso y el test HTTP. |
| Afiliado existente → obra social, plan, cobertura, `copagoPct` | Falta todo (0 coincidencias de `afiliado`/`copago`/`padron` en `src/` y `tests/`). |
| Afiliado inexistente → 404 "afiliado no encontrado" | Falta; hay plantillas de 404 en API y simulador. |
| Pantalla con "SIMULACIÓN" y simulador sin red | Falta para obras sociales; patrón completo en Mercado Pago. |

## 6. Decisiones a cerrar en Propose

1. **Código de regla del DNI duplicado**: hoy `DNI_DUPLICADO` (`paciente-repository.ts:18`), la KB no define un `RN-PA-xx` y el design de C-01 lo dejó anotado. Confirmar si se conserva el literal o se formaliza un código `RN-*`.
2. **Modelo de `Paciente`**: la KB y `CHANGES.md:144` incluyen `obraSocialId?`/`nroAfiliado?` (y `email?`), pero el tipo actual no los tiene. Definir si C-08 los agrega y si se validan contra el padrón (US-030 dice "obra social descriptiva", el modelo la trata como referencia por id).
3. **Tipos del padrón**: la KB no especifica si `cobertura` es porcentaje o monto, si `copagoPct` va 0-100 o 0-1, ni la forma de `planes`.
4. **Mensaje de no encontrado**: "afiliado no encontrado" (RN-SM-02 y ficha) vs "no encontrado" (Flujo 8, `07_flujos_principales.md:90`). Predominan la regla y la ficha.
5. **RBAC de la consulta**: US-061 la pide para recepción, pero la matriz da lectura a los cuatro roles (paciente solo lo propio). Definir headers y alcance en los tests.
6. **Zona incompleta**: `CHANGES.md:369` no incluye `tests/api/pacientes.test.ts`, pero el criterio de 409 exige una prueba HTTP. Requerir confirmación del team lead antes de tocar ese archivo (sería aditivo, como `src/api/app.ts`).
7. **Formato de DNI del seed**: la KB ejemplifica `00.000.0NN` (`04_modelo_de_datos.md:99`) pero C-01 entregó `99xxxxxx` y el código usa `99000001..99000010`. Mantener el del código y, si aplica, proponer corrección de KB.
8. **`dimension` de `ErrorDeRegla`** (`result.ts:6`) solo admite `profesional | sillon | paciente`; si el spec quiere una dimensión de cobertura, hay que tocar `src/domain/shared/result.ts` (fuera de Zona → revisión del team lead).

## 7. Plantillas a reutilizar

- Caso de uso con errores discriminados y repos reales: `src/application/agenda/crearTurno.ts:18-104` y `tests/application/agenda/crearTurno.test.ts:21-30,122-136`.
- Simulador completo: `src/simulators/mercadopago/*`, `public/sim/mercadopago.html`, `tests/simulators/mercadopago/*`.
- Contrato HTTP de errores: `src/api/middleware/errores.ts:40-67` y `tests/api/errores.test.ts`.
- Datos ficticios y reloj fijo: `src/infrastructure/seed/datos-seed.ts:48-61`, `src/infrastructure/clock/clock.ts:10-16`.

## 8. Riesgos y siguiente paso

- **Línea base no verde en `master`** (verificado en esta rama, con un único archivo `.md` sin seguimiento agregado): `npm run typecheck` pasa, pero `npm test` da **14 fallos / 387 tests** en `tests/api/auditoria.test.ts` (7) y `tests/api/odontograma.test.ts` (7): todas las rutas responden 404 porque `src/api/app.ts:22-25` no monta `auditoriaRouter` ni `odontogramaRouter` (este último se importa en `:9` pero no se usa). Es un problema preexistente, ajeno a C-08 y fuera de su Zona: **no se tocó**. Requiere comunicación al team lead antes del cierre del TP (la regla "sin rojo no se archiva" aplica al change propio, pero la base compartida también debe quedar verde).
- En el momento del Explore no había change OpenSpec para C-08 en `openspec/changes/`; ya fue creado y ajustado (ver §9). El flujo continúa con `/opsx:apply` con TDD estricto, `npm test` + `npm run typecheck`, handoff `knowledge-base/entrega/C-08.md` y PR con la plantilla.
- Regla dura aplicable: no inventar en Apply lo que no esté en la spec aprobada (`AGENTS.md` regla 12); por eso las ocho decisiones anteriores deben resolverse antes de escribir código.
- C-06 (bot WhatsApp simulado) espera a C-08: `buscarOCrearPorTelefono` es la interfaz que ese change necesita (`CHANGES.md:300,305`).

## 9. Ajuste del Propose antes de Apply (2026-11-25)

- Pedido del usuario en tres puntos, aplicado solo a artefactos OpenSpec y a este handoff; **sin código ni commits**.
- **Ajuste 1 — actualización de ficha**: se agregó `PUT /api/pacientes/:id` como reemplazo completo con las mismas validaciones del alta. Conservar el DNI propio es válido e idempotente (`200`); asignar el DNI de otro paciente da `409` con `error.tipo = 'regla'` y `error.regla = 'DNI_DUPLICADO'`; un id inexistente da `404` con `paciente no encontrado`. RBAC: solo `admin` y `recepcion`.
- **Ajuste 2 — `400` vs `409`**: `400 error.tipo = 'entrada'` para `nombre`/`dni` vacíos o con espacios, `email` inválido y parámetro `nro` faltante o con solo espacios en la consulta de cobertura. `AF-0004` sigue siendo `409 error.tipo = 'regla'` con `RN-SM-02`. El caso `%20` de cobertura pasó de `404` a `400`.
- **Ajuste 3 — enmascaramiento**: el mismo `dni` (`99****01`) y `telefono` (`+54 9 11 0000-**01`) en `GET /api/pacientes`, `GET /api/pacientes/:id` y la respuesta de `PUT`; se aplica solo a la respuesta HTTP, sin alterar los datos crudos en memoria.
- Artefactos actualizados: `openspec/changes/ficha-paciente-y-cobertura-obra-social-sim/proposal.md`, `design.md` (decisiones D13-D15), `tasks.md` (tareas 2.6, 2.7, 3.1 y 5.1) y los deltas `specs/ficha-paciente/spec.md`, `specs/cobertura-obra-social-simulada/spec.md`, `specs/datos-ficticios/spec.md`.
- Verificación: `openspec validate ficha-paciente-y-cobertura-obra-social-sim --strict` → **válido**; los 4 artefactos siguen completos. No se ejecutaron `npm test` ni `npm run typecheck` porque el ajuste no tocó código.

## Fuentes consultadas

`CHANGES.md:31,38,60-61,88,354-380,555-557`; `AGENTS.md`; `knowledge-base/03_actores_y_roles.md`, `04_modelo_de_datos.md`, `05_reglas_de_negocio.md`, `06_funcionalidades.md`, `07_flujos_principales.md`, `09_decisiones_y_supuestos.md`, `10_preguntas_abiertas.md`, `entrega/C-01.md`, `entrega/C-02.md`, `entrega/C-03.md`, `entrega/C-05.md`, `entrega/C-11.md`; `src/**` (50 archivos releídos); `tests/**` (31 archivos relevados); `package.json`, `tsconfig.json`, `vitest.config.ts`.
