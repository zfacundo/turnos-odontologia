# Tasks

> Strict TDD: en cada tarea de comportamiento primero se escribe el test (RED, ejecutar y verlo fallar), luego el mínimo código (GREEN), triangular con un segundo caso y refactorizar. Nombres de test en formato `dado … cuando … entonces …`. Fechas fijas con offset `-03:00`; sin mocks de dominio ni repos.

## 1. Andamiaje del proyecto

- [ ] 1.1 Crear `package.json` (CommonJS, `engines.node >= 20`, scripts `dev`/`build`/`start`/`test`/`typecheck`, deps `express`; devDeps `typescript`, `tsx`, `vitest`, `supertest`, `@types/express`, `@types/supertest`, `@types/node`) y verificar que `npm install` termina sin errores
- [ ] 1.2 Crear `tsconfig.json` (strict, `noUncheckedIndexedAccess`, CommonJS, ES2022, `include: src, tests`) y `vitest.config.ts` (`tests/**/*.test.ts`, `TZ` Buenos Aires); verificar con un test humo temporal `tests/domain/shared/humo.test.ts` que `npm test` corre (borrarlo al pasar 2.1)

## 2. Result e Intervalo (`intervalo-y-bloques`)

- [ ] 2.1 RED→GREEN: `tests/domain/shared/intervalo.test.ts` — crear intervalo válido / inicio = fin / inicio > fin (RN-AG-01); implementar `src/domain/shared/result.ts` (`Result`, `ok`, `fallo`, `ErrorDeRegla`) y `crearIntervalo` en `intervalo.ts`; verificar 3 escenarios en verde
- [ ] 2.2 RED→GREEN: escenarios de `seSolapan` — contiguos `false`, contenido `true`, parcial `true`, separados `false`, idénticos `true`, simetría; implementar `seSolapan` con `<` estricto; verificar 6 escenarios en verde
- [ ] 2.3 RED→GREEN: `tests/domain/shared/bloques.test.ts` — 9:10 no alineado, 9:15 alineado, 14:00 alineado, 9:15:30 no alineado; implementar `estaAlineadoA15` y `BLOQUE_MIN` en `bloques.ts` (documentar supuesto de offset entero); verificar 4 escenarios en verde
- [ ] 2.4 RED→GREEN: `crearIntervaloAlineado` — alineado aceptado, inicio desalineado y fin desalineado → `RN-AG-03`; verificar 3 escenarios en verde
- [ ] 2.5 REFACTOR: revisar que `src/domain/shared/` no importa Express/fs ni usa `new Date()` sin argumentos (`grep`), y `npm test` sigue verde

## 3. Modelo de configuración y pacientes (`catalogo-configuracion`)

- [ ] 3.1 RED→GREEN: `tests/domain/configuracion/prestacion.test.ts` — duración 30 y 45 aceptadas; 20, 0, −15 y 22.5 rechazadas con `RN-CF-01`; implementar `Prestacion` + `validarPrestacion` en `src/domain/configuracion/prestacion.ts`; verificar 6 escenarios en verde
- [ ] 3.2 Definir tipos `Sillon`, `Profesional`/`Franja`/`DiaSemana`, `Bloqueo` (`src/domain/configuracion/`), `Paciente` (`src/domain/pacientes/`), y `Rol`/`ROLES`/`Usuario` (`src/domain/shared/`); verificar con `npm run typecheck`
- [ ] 3.3 Definir puertos en `src/application/ports/` (`repositorios.ts` con `TurnoRegistro` (tipo mínimo, sin `Turno` completo) y `FiltroTurnos`, `clock.ts`, `auditoria.ts` con `EventoAuditoria`) según design D5; verificar con `npm run typecheck`

## 4. Infraestructura en memoria (`persistencia-en-memoria`, `datos-ficticios`)

- [ ] 4.1 RED→GREEN: `tests/infrastructure/turno-repository.test.ts` — escenarios "guardar y buscar por id" y "actualizar reemplaza el turno guardado"; implementar `TurnoRepositoryEnMemoria` (`guardar`, `buscarPorId`, `actualizar`) (copias con `structuredClone`); verificar en verde
- [ ] 4.2 RED→GREEN: escenario "listar activos filtra por rango, profesional y sillón y excluye cancelados" (incluye turno contiguo, usa `seSolapan`); implementar `listarActivos`; verificar en verde
- [ ] 4.3 RED→GREEN: `tests/infrastructure/paciente-repository.test.ts` — DNI duplicado rechazado (`DNI_DUPLICADO`) sin alterar el existente, buscar por DNI encontrado/no encontrado; implementar `PacienteRepositoryEnMemoria`; verificar en verde
- [ ] 4.4 RED→GREEN: `tests/infrastructure/auditoria.test.ts` — escenario "registrar solo agrega y los eventos se listan en orden"; implementar `AuditoriaEnMemoria` (+ `eventos()`, fuera del puerto); verificar en verde
- [ ] 4.5 Implementar repos en memoria de sillón, prestación, profesional y bloqueo (`listar`, `buscarPorId`, `listarEn(rango)`); cubiertos por los tests del seed en 4.7–4.8; verificar con `npm run typecheck`
- [ ] 4.6 RED→GREEN: `tests/infrastructure/clock.test.ts` — `SIM_NOW` válida devuelve siempre el mismo instante (`2026-10-14T15:30:00Z`), `SIM_NOW` inválida falla mencionando `SIM_NOW`; implementar `RelojDeSistema`, `RelojFijo`, `relojDesdeEnv` en `src/infrastructure/clock/`; verificar en verde
- [ ] 4.7 RED→GREEN: `tests/infrastructure/seed-configuracion.test.ts` (reloj fijo `2026-12-01T10:00-03:00`) — 2 sillones y 2 profesionales activos, franjas lun-vie 09-13/14-19 sin fin de semana, 5 prestaciones con sus duraciones válidas, bloqueo "reservado urgencias" `[18:30,19:00)` el lunes 2026-12-07 y ninguno el sábado 2026-12-05; implementar `cargarSeed(clock)` en `src/infrastructure/seed/` (design D7); verificar 5 escenarios en verde
- [ ] 4.8 RED→GREEN: `tests/infrastructure/seed-datos-ficticios.test.ts` — 8..12 pacientes, DNI `^99\d{6}$`, teléfonos `^\+54 9 11 0000-00\d{2}$`, DNI sin repetir, usuarios 1 admin/1 recepcion/2 odontologo con `profesionalId` existentes y distintos; completar pacientes y usuarios del seed; verificar 6 escenarios en verde

## 5. API (`salud-api`, `catalogo-configuracion`)

- [ ] 5.1 RED→GREEN: `tests/api/health.test.ts` — `GET /api/health` → 200 `{status:"ok"}`, `GET /api/no-existe` → 404 JSON; implementar `src/api/deps.ts` y `createApp(deps)` en `src/api/app.ts` (sin `listen`); verificar en verde con supertest
- [ ] 5.2 RED→GREEN: en `tests/api/health.test.ts` — rol válido 200, `X-Rol: superusuario` → 400 mencionando `X-Rol`, sin headers → 200; implementar `src/api/middleware/rol-simulado.ts`; verificar 3 escenarios en verde
- [ ] 5.3 RED→GREEN: `tests/api/errores.test.ts` (app Express mínima con el manejador real y rutas que lanzan) — regla `RN-AG-02`/`profesional`/`t-1` → 409 con campos, entrada → 400, permiso → 403, inesperado "boom" → 500 sin mensaje ni stack; implementar `src/api/middleware/errores.ts` (clases, `lanzarSiFallo`, manejador, JSON malformado → 400); verificar 4 escenarios en verde
- [ ] 5.4 RED→GREEN: `tests/api/catalogo.test.ts` — con seed: 200 con 2/2/5 y prestación `orto` con `duracionMin` 45; con repos vacíos: listas vacías; dos apps con deps distintas son independientes; implementar `src/api/routes/catalogo.ts` y montarlo en `app.ts`; verificar 4 escenarios en verde
- [ ] 5.5 Implementar `src/server.ts` (lee `PORT`, `SEED`, `SIM_NOW`; arma deps con `cargarSeed` o repos vacíos; `listen`) y verificar manualmente con `npm run dev` que `curl localhost:3000/api/health` y `/api/catalogo` responden

## 6. Estáticos base

- [ ] 6.1 Crear `public/styles/tokens.css` con las variables claro/oscuro y tipografías del prototipo (`docs/discovery/prototipo/agenda_odontologia.html`); verificar que `GET /styles/tokens.css` responde 200 con `npm run dev`
- [ ] 6.2 Crear `public/js/api.js` (fetch a `/api` con headers `X-Usuario`/`X-Rol` desde `localStorage`, devuelve `{ ok, status, data }`); verificar desde la consola del navegador que `api('/catalogo')` devuelve el seed

## 7. Documentación y cierre

- [ ] 7.1 Escribir `README.md`: requisitos (Node 20), `npm install`, `npm run dev`, `npm test`, variables `PORT`/`SEED`/`SIM_NOW`/`TZ`, estructura de carpetas, aviso de datos ficticios y auth simulada; verificar siguiendo los pasos desde cero
- [ ] 7.2 Verificar reglas duras: `grep` de `any`, `Date.now()`/`new Date()` sin args y `express`/`fs` en `src/domain/`; ningún archivo editado fuera de la Zona de C-01 (más los tests listados en design)
- [ ] 7.3 `npm run typecheck` sin errores y `npm test` en verde (todos los escenarios de los 5 specs cubiertos por al menos un test dado/cuando/entonces)

## Workflow follow-up

- Abrir PR `C-01-base-proyecto-y-modelo-dominio` con la plantilla; revisión del team lead (Governance HIGH); al mergear se abre GATE 1.
- Dejar handoff en `knowledge-base/entrega/C-01.md` y archivar el change con `/opsx:archive`.
