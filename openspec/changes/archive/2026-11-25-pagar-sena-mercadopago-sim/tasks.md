# Tasks

> TDD estricto en cada grupo: primero el test rojo, después el código mínimo para ponerlo en verde, después el refactor. Los tests se nombran "dado … cuando … entonces …". No se mockean ni el dominio ni los repositorios: solo se fija el `Clock` (`RelojFijo`). Los escenarios a cubrir están en `specs/pago-sena-simulado/spec.md` y las decisiones en `design.md` (D1–D11).

## 0. Precondición

- [x] 0.1 Confirmar con el team lead que se arregla en `master` la línea base en rojo (`odontogramaRouter` y `auditoriaRouter` sin montar en `src/api/app.ts`), y traer ese arreglo a la rama. Se verifica con `npx vitest run`, que debe dar 0 fallos antes de empezar. Si todavía no está, dejar registrado y verificar C-11 con `npx vitest run tests/simulators/mercadopago`. **Resuelto**: el PR #18 (`fix-rutas-c09-c10`) montó ambos routers en `master`; `npx vitest run` da 794/794 en verde (2026-11-25).

## 1. Dominio puro (`src/simulators/mercadopago/pagoSena.ts`)

- [x] 1.1 Tests rojos en `tests/simulators/mercadopago/pagoSena.test.ts` para `validarPagoSena`: `reservado` y `confirmado` sin señar → ok; `cancelado`, `atendido` y `ausente` → `RN-SM-01`, mensaje con "SU-07" y `conflicto.turnoId` (un test por estado); ya señado → `RN-SM-01` con "turno ya señado"; cancelado y señado → mensaje de estado (D5). Se verifica viendo los tests en rojo.
- [x] 1.2 Implementar el tipo `PagoSena` (`simulado: true` literal), `EstadoPagoSena`, `MONTO_SENA_SIMULADA`, `AVISO_SIMULACION = 'SIMULACIÓN — no es Mercado Pago real'` y `validarPagoSena`, sin Express, `fs`, `Date.now()` ni `new Date()`. Se verifica con los tests de 1.1 en verde y `npm run typecheck` limpio.

## 2. Repositorio de pagos en memoria (`pagoSenaRepository.ts`)

- [x] 2.1 Tests rojos en `tests/simulators/mercadopago/pagoSenaRepository.test.ts`: guardar y `listarPorTurno` devuelven copias; un turno sin pagos devuelve una lista vacía; dos intentos del mismo turno se listan los dos. Se verifica viendo los tests en rojo.
- [x] 2.2 Implementar la interfaz `PagoSenaRepository` y `PagoSenaRepositoryEnMemoria` con `structuredClone` (D7). Se verifica con los tests de 2.1 en verde.

## 3. Caso de uso `pagarSena` (`pagarSena.ts`)

- [x] 3.1 Tests rojos en `tests/simulators/mercadopago/pagarSena.test.ts`, con `TurnoRepositoryEnMemoria`, `PagoSenaRepositoryEnMemoria`, `AuditoriaEnMemoria` y `RelojFijo` reales, cubriendo los escenarios de los requisitos "Pago aprobado…", "Pago rechazado…", "Registro de cada intento…", "Solo se señan turnos…", "Un turno ya señado…", "Turno inexistente", "Solo el paciente…" (incluido sin usuario) y "Auditoría…". Para cada fallo se verifica que no se guarda pago ni se audita. Se verifica viendo los tests en rojo.
- [x] 3.2 Implementar `pagarSena` con el orden rol → entrada → 404 → `validarPagoSena` → actualizar (solo si es aprobado) → guardar pago → auditar (D5, D6). Usa `randomUUID()` para el id y `deps.clock.ahora()` para `fecha` y `actualizadoEn`. Se verifica con los tests de 3.1 en verde.

## 4. Router y montaje (`router.ts`, `src/api/app.ts`)

- [x] 4.1 Tests rojos en `tests/simulators/mercadopago/api.test.ts` (supertest sobre `createApp(cargarSeed(new RelojFijo(…)))`): `201` aprobado y rechazado, con `simulado: true`, `aviso` exacto, `pago` y `turno.senado`; `400` para un resultado inválido, sin `turnoId` y con un cuerpo que no es objeto; `403` para admin, recepción, odontólogo y sin rol; `404` para un turno inexistente; `409` `RN-SM-01` para ya señado (el turno se señó antes por la misma API); y `senado` visible en `GET /api/turnos` después de aprobar. Se verifica viendo los tests en rojo.
- [x] 4.2 Implementar `mercadoPagoRouter(deps, pagos = new PagoSenaRepositoryEnMemoria())` con `POST /sim/mercadopago/pagos`, el parseo del cuerpo y la traducción de errores (`ErrorDePermiso`, `ErrorDeEntrada`, `FalloDeRegla` y el 404 directo), según D8.
- [x] 4.3 En `src/api/app.ts`, agregar solo el `import { mercadoPagoRouter } …` y la línea `app.use('/api', mercadoPagoRouter(deps));` antes del 404 de `/api`. No tocar nada más del archivo. Se verifica con los tests de 4.1 en verde y `git diff src/api/app.ts`, que debe mostrar solo esas dos líneas agregadas.

## 5. Pantalla simulada (`public/sim/mercadopago.html`)

- [x] 5.1 Tests rojos en `tests/simulators/mercadopago/pantalla.test.ts`: `GET /sim/mercadopago.html` → `200`, con el texto `SIMULACIÓN — no es Mercado Pago real` y los botones Aprobar y Rechazar; el HTML solo hace `fetch` a `/api/sim/mercadopago/pagos` con `X-Rol: paciente` y no tiene URLs `http(s)://`. Se verifica viendo los tests en rojo.
- [x] 5.2 Implementar la pantalla según D9: banner de simulación, lectura de `?turnoId=`, aviso y botones deshabilitados si falta el `turnoId`, mensaje del resultado o del error, y estilos desde `/styles/tokens.css`. Solo datos ficticios. Se verifica con los tests de 5.1 en verde.
- [x] 5.3 Verificación manual en el navegador (D11), porque no está en el spec. Con `npm run dev`, crear un turno y abrir `/sim/mercadopago.html?turnoId=<id>`. Tocar Rechazar: la pantalla muestra "Pago rechazado" y el turno no cambia. Tocar Aprobar: muestra "Seña aprobada" y el turno aparece señado en `GET /api/turnos`. Tocar Aprobar otra vez: muestra el mensaje del 409 "turno ya señado". Abrir la pantalla sin `turnoId`: muestra el aviso y los botones están deshabilitados. Revisar que la consola no tenga errores. Dejar el resultado en el handoff, y una captura si se toma, siempre con datos ficticios.

## 6. Sin red (`tests/simulators/mercadopago/sin-red.test.ts`)

- [x] 6.1 Test dinámico (D10.1): espiar `globalThis.fetch`, `http.request`, `https.request` y `net.connect` para que fallen si se llaman, correr `pagarSena` aprobado y rechazado sobre dos turnos habilitados, y verificar que no hubo llamadas. Se verifica con el test en verde.
- [x] 6.2 Test estático (D10.2): leer los fuentes de `src/simulators/mercadopago/` y `public/sim/mercadopago.html`, y verificar que no haya `fetch(` en el `.ts`, ni imports de `http`, `https`, `net`, `axios` ni `mercadopago`, ni URLs `http(s)://` en el HTML. Se verifica con el test en verde.

## 7. Verificación integral y entrega

- [x] 7.1 Correr `npm test` y `npm run typecheck`: deben quedar en verde, salvo los tests de línea base de 0.1 si siguen sin arreglar, que se reportan aparte con la salida. Revisar las reglas duras: sin `any`; sin `Date.now()`, `new Date()` sin argumentos, Express ni `fs` en `pagoSena.ts`; sin datos reales; todos los escenarios del spec con al menos un test. Correr `openspec validate pagar-sena-mercadopago-sim`.
- [x] 7.2 Escribir el handoff en `knowledge-base/entrega/C-11.md`: qué se hizo, cómo se verificó (incluida la verificación manual de 5.3), qué sigue y decisiones abiertas. Esas decisiones son: el monto, la nota a la KB 04 (0..N intentos, máx. 1 aprobado), la falta de validación de propiedad del paciente, el repositorio de pagos fuera de `Deps`, los cuerpos de error sin `aviso` y la línea base en rojo.

## Workflow follow-up

- Commit con conventional commits `feat(pagar-sena-mercadopago-sim): …`, push y PR con `.github/pull_request_template.md`, solo con autorización de la persona responsable.
- Revisión y merge por el team lead; después, `/opsx:archive`.
