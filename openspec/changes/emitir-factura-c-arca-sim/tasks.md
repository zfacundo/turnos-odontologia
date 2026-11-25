# Tasks

> TDD estricto en cada grupo: primero el test rojo, después el código mínimo para ponerlo en verde, después el refactor. Los tests se nombran "dado … cuando … entonces …". No se mockean ni el dominio ni los repositorios: solo se fija el `Clock` (`RelojFijo`). Los escenarios a cubrir están en `specs/factura-c-simulada/spec.md` y las decisiones en `design.md` (D1–D12). Criterio visual de aceptación: el mockup aprobado en `mockups/arca-comprobante.html` y sus capturas en `mockups/previews/`.

## 0. Precondiciones

- [x] 0.1 Mockup aprobado: `design.md` §UI Mockups dice `Approval: approved (<fecha>, by user)`. Sin esa aprobación no se empieza el grupo 5. Se verifica leyendo `design.md` y `mockups/README.md`.
- [ ] 0.2 Línea base: correr `npx vitest run` y registrar si siguen los 14 tests en rojo de `master` (`odontograma`, `auditoria`). Si siguen, C-12 se verifica con `npx vitest run tests/simulators/arca` y la línea base se reporta aparte en el handoff.

## 1. Dominio puro (`src/simulators/arca/facturaC.ts`)

- [ ] 1.1 Tests rojos en `tests/simulators/arca/facturaC.test.ts`:
  - `validarEmisionFacturaC`: `atendido` → ok; `reservado`, `confirmado`, `cancelado` y `ausente` → `RN-SM-03`, con un mensaje que cita "SU-07" y `conflicto.turnoId` (un test por estado).
  - `formatearNumero(1)` → `00001-00000001`; `formatearNumero(12)` → `00001-00000012`.
  - `generarCae('2026-12-01', 1)` → `26120101000001`, siempre con 14 dígitos.
  - `fechaArgentina` de `2026-12-01T12:00-03:00` → `2026-12-01`, y de `2026-11-30T23:59-03:00` → `2026-11-30`.
  - `sumarDias('2026-12-01', 10)` → `2026-12-11` y `sumarDias('2026-12-28', 10)` → `2027-01-07`.

  Se verifica viendo los tests en rojo.
- [ ] 1.2 Implementar en `facturaC.ts`:
  - los tipos `FacturaC` (`simulado: true` literal, `tipo: 'C'`), `Emisor` y `Receptor`;
  - las constantes `AVISO_SIMULACION = 'SIMULACIÓN — sin validez fiscal'`, `PUNTO_DE_VENTA = '00001'`, `IMPORTE_FACTURA_SIMULADA`, `EMISOR_SIMULADO` y `DIAS_VENCIMIENTO_CAE = 10`;
  - las funciones de 1.1, según D3 y D4.

  No puede usar Express, `fs`, `Date.now()` ni `new Date()` sin argumentos. Se verifica con los tests de 1.1 en verde y `npm run typecheck` limpio.

## 2. Repositorio de facturas en memoria (`facturaCRepository.ts`)

- [ ] 2.1 Tests rojos en `tests/simulators/arca/facturaCRepository.test.ts`:
  - `ultimoNumero()` empieza en 0 y después de dos `guardar` devuelve 2;
  - `buscarPorTurno` devuelve una copia o `undefined`;
  - modificar la copia devuelta no altera lo guardado.

  Se verifica viendo los tests en rojo.
- [ ] 2.2 Implementar la interfaz `FacturaCRepository` y `FacturaCRepositoryEnMemoria`, con `structuredClone` (D2). Se verifica con los tests de 2.1 en verde.

## 3. Caso de uso `emitirFacturaC` (`emitirFacturaC.ts`)

- [ ] 3.1 Tests rojos en `tests/simulators/arca/emitirFacturaC.test.ts`, con `TurnoRepositoryEnMemoria`, el repositorio de pacientes y de prestaciones en memoria, `FacturaCRepositoryEnMemoria`, `AuditoriaEnMemoria` y `RelojFijo`, todos reales. Cubren los escenarios de estos requisitos:
  - "Emisión…" (recepción y admin);
  - "Numeración correlativa";
  - "Un pedido fallido no consume número", incluida la secuencia T, R (409), U;
  - "CAE…";
  - "Fecha de emisión y vencimiento…" (medianoche y fin de año);
  - "Importe, emisor y receptor…", incluido el paciente inexistente y la ausencia del DNI completo en la salida;
  - "Solo se facturan turnos atendidos" (4 estados);
  - "Un turno se factura una sola vez" (`ya-facturado` con `facturaId`);
  - "Turno inexistente";
  - "Validación del cuerpo";
  - "Solo recepción y administración…";
  - "Auditoría…".

  En cada fallo se verifica que no se guarda factura y que no se audita. Se verifica viendo los tests en rojo.
- [ ] 3.2 Implementar `emitirFacturaC(deps, usuario, cuerpo)` con el orden de D8: rol → entrada → 404 → estado → ya facturado → armar → guardar → auditar. Usa `randomUUID()`, `deps.clock.ahora()`, `pacientePublico` de C-08 sin modificarlo (D6), y concepto y fallback según D5. Se verifica con los tests de 3.1 en verde.

## 4. Router y montaje (`router.ts`, `src/api/app.ts`)

- [ ] 4.1 Tests rojos en `tests/simulators/arca/api.test.ts`, con supertest sobre `createApp(cargarSeed(new RelojFijo(…)))` y el turno puesto `atendido` en el repo. Casos:
  - `201` con `simulado: true`, `aviso` exacto y `factura` completa (D9);
  - números `00001-00000001` y `00001-00000002` en dos emisiones;
  - `400` para cuerpo `{}`, `turnoId` numérico y un array;
  - `403` para `odontologo`, `paciente` y sin rol (incluido sin rol con un turno inexistente);
  - `404` para un turno inexistente;
  - `409` `RN-SM-03` para un turno `reservado`;
  - `409` de duplicado, con el cuerpo exacto `{ error: { tipo: 'regla', regla: 'RN-SM-03', mensaje, conflicto: { turnoId, facturaId } } }` (D7).

  Se verifica viendo los tests en rojo.
- [ ] 4.2 Implementar `arcaRouter(deps, facturas = new FacturaCRepositoryEnMemoria())` con `POST /sim/arca/facturas`. Traduce `permiso`, `entrada` y `regla` a `ErrorDePermiso`, `ErrorDeEntrada` y `FalloDeRegla`, y responde directamente el `404` y el `409` de `ya-facturado` (D7, D9).
- [ ] 4.3 En `src/api/app.ts`, agregar solo `import { arcaRouter } from '../simulators/arca/router';` y `app.use('/api', arcaRouter(deps));` antes del 404 de `/api`. Se verifica con los tests de 4.1 en verde y con `git diff src/api/app.ts`, que debe mostrar solo esas dos líneas agregadas.

## 5. Pantalla del comprobante (`public/sim/arca.html`)

- [ ] 5.1 Tests rojos en `tests/simulators/arca/pantalla.test.ts`:
  - `GET /sim/arca.html` → `200`, con el texto `SIMULACIÓN — sin validez fiscal` y un botón "Emitir factura C";
  - el HTML solo hace `fetch` a `/api/sim/arca/facturas` con `X-Rol: recepcion`;
  - el HTML no tiene URLs `http(s)://`.

  Se verifica viendo los tests en rojo.
- [ ] 5.2 Implementar la pantalla según D10 y el mockup aprobado:
  - franja de simulación, que también se ve al imprimir;
  - lectura de `?turnoId=`, con aviso y botón deshabilitado si falta;
  - emisión solo al tocar el botón;
  - comprobante con tipo C, número, fechas, emisor, receptor con DNI enmascarado, concepto, importe, CAE y vencimiento;
  - botón Imprimir, con `@media print` que oculta los controles;
  - mensaje de error, con el caso "ya tiene factura";
  - estilos de `/styles/tokens.css`.

  Solo datos ficticios. Se verifica con los tests de 5.1 en verde.
- [ ] 5.3 Verificación manual y visual (D10, D12) del comportamiento de interfaz que no está en el spec. Con `npm run dev` y `SIM_NOW` fijo, recorrer:
  - al cargar con `?turnoId=` la pantalla **no** emite, y recargar tampoco; solo emite al tocar "Emitir factura C";
  - emitir → comprobante `00001-00000001` con CAE, vencimiento y DNI enmascarado;
  - emitir otra vez el mismo turno → mensaje del 409 "ya facturado";
  - vista de impresión: solo el comprobante, con la franja y la marca de agua, sin controles;
  - sin `turnoId` → aviso "Falta el turno" y el botón deshabilitado;
  - con un turno `reservado` → mensaje SU-07;
  - capturar 390×844 y 1440×900 en `mockups/verify/` y compararlas con el mockup;
  - revisar la consola y las requests fallidas.

  Registrar en `design.md` `Visual verify: passed | differences | manual (<fecha>)`, con las diferencias clasificadas como blocker, major o minor, y dejar el resultado en el handoff.

## 6. Sin red (`tests/simulators/arca/sin-red.test.ts`)

- [ ] 6.1 Test dinámico (D11): espiar `globalThis.fetch`, `http.request`/`get`, `https.request`/`get`, `net.connect`/`createConnection` y `net.Socket.prototype.connect` para que fallen si se llaman. Emitir facturas de dos turnos `atendido` y verificar que no hubo llamadas. Se verifica con el test en verde.
- [ ] 6.2 Test estático (D11): los `.ts` de `src/simulators/arca/` no tienen `fetch(`, ni imports de `http`, `https`, `net`, `tls` o `dgram`, ni de `axios`, `node-fetch`, `undici`, `soap`, `afip` o `arca` como paquetes, ni URLs `http(s)://`. `public/sim/arca.html` tampoco tiene URLs absolutas. Se verifica con el test en verde, y además viendo que falla con un archivo temporal que tenga `fetch(` (borrarlo después).

## 7. Verificación integral y entrega

- [ ] 7.1 Correr `npm test` y `npm run typecheck`. Deben quedar en verde, salvo la línea base de 0.2 si sigue, que se reporta aparte con la salida. Revisar las reglas duras:
  - sin `any`;
  - sin `Date.now()`, `new Date()` sin argumentos, Express ni `fs` en `facturaC.ts`;
  - solo datos ficticios;
  - cada escenario del spec con al menos un test.

  Correr `openspec validate emitir-factura-c-arca-sim`.
- [ ] 7.2 Escribir el handoff en `knowledge-base/entrega/C-12.md`: qué se hizo, cómo se verificó (incluida la verificación de 5.3), qué sigue y las decisiones abiertas:
  - importe constante;
  - CAE recortado (D3);
  - 409 de duplicado armado en el router y la sugerencia de generalizar `ErrorDeRegla.conflicto` (D7);
  - numeración que se reinicia (DD-03);
  - la nota a la KB 04 sobre la forma de `FacturaC` y el ejemplo de DNI `00.000.0NN`, que contradice el spec `datos-ficticios`;
  - la línea base en rojo.

## Workflow follow-up

- Commit con conventional commits `feat(emitir-factura-c-arca-sim): …`, push y PR con `.github/pull_request_template.md`, solo con autorización de la persona responsable.
- Revisión y merge por el team lead; después, `/opsx:archive`.
- Archivar también C-11 (`pagar-sena-mercadopago-sim`), que está mergeado y sin archivar.
