# Tasks

> **Antes de empezar**: strict TDD (governance MEDIUM). Cada tarea de código empieza con un test rojo, con nombre en formato dado / cuando / entonces (regla dura 8) y el comentario `// spec: arca-ver-factura-y-confirmar-emision`. Repositorios en memoria reales, `AuditoriaEnMemoria` y `RelojFijo` en `2026-12-01T12:00:00-03:00`; nunca mockear repositorios (regla dura 7). Sin `any`, sin `innerHTML` con datos del servidor, datos ficticios. No tocar `public/admin/` ni el change `panel-boton-emitir-factura`.

## 1. Red de seguridad

- [x] 1.1 Correr `npm test` y `npm run typecheck` y anotar el baseline (N tests en verde, en especial `tests/simulators/arca/*`, `tests/api/admin-estaticos.test.ts` y `tests/api/sin-enlaces-viejos.test.ts`). Si algo falla antes de empezar, frenar y reportarlo como falla previa.

## 2. Dominio: cuerpo y borrador del comprobante (D2)

- [x] 2.1 RED→GREEN en `tests/simulators/arca/facturaC.test.ts`: `armarCuerpoFacturaC({ turnoId, concepto, receptor, ahora })` devuelve tipo `C`, `fechaEmision` en Argentina (`2026-12-01` a las 12:00 y `2026-11-30` a las 23:59 -03:00), importe ficticio fijo, emisor `Consultorio Ficticio` y `simulado: true`. `armarBorradorFacturaC` agrega `numero`, `cae` y `vencimientoCae` en `null` y no tiene `id` ni `emitidaEn`. Implementar en `src/simulators/arca/facturaC.ts` con `CuerpoFacturaC`, `FacturaC extends CuerpoFacturaC` (mismos campos que hoy) y `BorradorFacturaC`.

## 3. Aplicación: construcción compartida y refactor de emitir (D3)

- [x] 3.1 Crear `src/simulators/arca/comprobanteDelTurno.ts` con `entradaDelComprobante(deps, turno, ahora)` (receptor con DNI enmascarado o solo `Consumidor Final` si el paciente no existe; concepto de la prestación o `CONCEPTO_POR_DEFECTO`) y `puedeOperarFacturas(usuario)` (`admin`, `recepcion`). Refactorizar `emitirFacturaC.ts` para usarlos junto con `armarCuerpoFacturaC`. Es un refactor: `tests/simulators/arca/emitirFacturaC.test.ts`, `api.test.ts` y `sin-red.test.ts` MUST seguir en verde sin cambios.

## 4. Aplicación: caso de uso `verFacturaC` (D4)

- [x] 4.1 RED en `tests/simulators/arca/verFacturaC.test.ts`, un test por escenario:
  - turno facturado → `estado: 'emitida'` con la factura guardada (id, número `00001-00000001`, CAE `26120101000001`);
  - turno `atendido` sin factura → `vista-previa`, `emitible: true`, sin `motivo`, concepto `Control y limpieza`, DNI `99****01`, `fechaEmision` `2026-12-01`, `numero`/`cae`/`vencimientoCae` `null`;
  - consultar dos veces y luego emitir → la factura es `00001-00000001`, el repositorio no tenía facturas antes de emitir y la auditoría tiene un solo `factura_emitida`;
  - turno `reservado` → `vista-previa`, `emitible: false`, `motivo.regla` `RN-SM-03` citando SU-07, sin facturas ni auditoría;
  - turno inexistente → error `no-encontrado` que nombra el id;
  - `odontologo`, `paciente` y sin usuario → error `permiso`, también para un turno inexistente (permiso antes que 404).
- [x] 4.2 GREEN: implementar `src/simulators/arca/verFacturaC.ts` con `DepsVerFacturaC` sin `auditoria` y con `facturas: Pick<FacturaCRepository, 'buscarPorTurno'>`. Correr y ver en verde.

## 5. API: `GET /api/sim/arca/facturas/:turnoId` (D1, D5)

- [x] 5.1 RED en `tests/simulators/arca/api.test.ts` (supertest, `createApp` con seed y `RelojFijo`), un test por escenario del spec:
  - emitida → `200` con `simulado: true`, `aviso`, `estado: 'emitida'`, misma factura que devolvió el `POST`; también con rol `admin`;
  - vista previa de `T` atendido → `200`, `emitible: true`, `numero: null`, `cae: null`, `vencimientoCae: null`, y `99000001` no aparece en `res.text`;
  - dos `GET` y luego `POST` → número `00001-00000001`; un `GET` de un turno facturado no cambia el número del siguiente `POST` (`00001-00000002`);
  - `reservado` → `200`, `emitible: false`, `motivo.regla: 'RN-SM-03'`;
  - `turno-inexistente` → `404` nombrándolo;
  - `odontologo` (sin la factura en el cuerpo), `paciente` → `403`; sin rol sobre `turno-inexistente` → `403`.
- [x] 5.2 GREEN: agregar la ruta en `src/simulators/arca/router.ts`, compartiendo el mismo repositorio de facturas que el `POST`. Sin tocar `Deps` ni `app.ts`. Correr la suite del simulador en verde.

## 6. Pantalla `/sim/arca.html` (D6, D7)

- [x] 6.1 RED en `tests/simulators/arca/pantalla.test.ts`:
  - ajustar el test de llamadas al requisito modificado: toda URL de `fetch` empieza con `/api/sim/arca/facturas`, hay al menos una llamada `GET` a `/api/sim/arca/facturas/` y ninguna `fetch` con argumento no literal;
  - el HTML tiene `<button …>Ver factura</button>` dentro del mismo `.actions` que "Emitir factura C";
  - tiene `<dialog` con `aria-labelledby` que apunta a un elemento con "¿Emitir Factura C?", botones "Cancelar" y "Emitir", `showModal(` y `@media (prefers-reduced-motion: reduce)`;
  - contiene `VISTA PREVIA — no emitida` y `Este turno ya tiene factura`;
  - no contiene `innerHTML`;
  - hace una `GET` a `/api/sim/arca/facturas/` al cargar (`cargarEstadoInicial`), tiene la nota `Este turno ya tiene factura`, el manejo del `409` que vuelve a consultar con `GET` y deshabilita el botón "Emitir" de la ventana según `emitible`.
  - Los tests de rótulo, `X-Rol: recepcion`, sin URLs absolutas y botón "Emitir factura C" se mantienen.
- [x] 6.2 GREEN: en `public/sim/arca.html`, botón "Ver factura", `consultar()`, `mostrarComprobante(f, modo)` con el rótulo de vista previa y `—` en número/CAE/vencimiento, deshabilitar "Emitir factura C" si está emitida, aviso de turno no atendido, `<dialog>` de confirmación con resumen, foco inicial en "Cancelar", retorno del foco al cerrar, "Emitir" deshabilitado durante el `POST`, fundido ≤ 150 ms anulado con `prefers-reduced-motion`. Además (Q-1..Q-3): `cargarEstadoInicial()` con una `GET` al cargar (emitida → "Emitir factura C" deshabilitado + nota sin dibujar el comprobante; no emitible → deshabilitado + motivo; emitible → habilitado), "Emitir" de la ventana deshabilitado si no es emitible, y ante `409 ya facturado` consultar y mostrar la factura, deshabilitar y avisar. Solo `textContent`. Correr `pantalla.test.ts`, `tests/api/admin-estaticos.test.ts` y `tests/api/sin-enlaces-viejos.test.ts` en verde.

## 7. Verificación y entrega

- [x] 7.1 Correr `npm test` y `npm run typecheck` en verde; comparar con el baseline de 1.1.
- [x] 7.2 Verificación manual en el navegador (la hace el orquestador; `npm run dev` con seed, solo datos ficticios), en `/sim/arca.html?turnoId=<id>`:
  - turno `atendido` sin factura: "Ver factura" muestra la vista previa rotulada, con `—` y sin "Imprimir"; recargar y volver a ver no consume número;
  - "Emitir factura C" abre la ventana con paciente, prestación e importe y el foco en "Cancelar"; "Cancelar" y `Escape` cierran sin emitir y el foco vuelve al botón; "Emitir" emite `00001-00000001`;
  - después de recargar, "Ver factura" muestra la factura emitida, deshabilita "Emitir factura C" y avisa "Este turno ya tiene factura"; "Emitir factura C" sobre un turno facturado no abre la ventana;
  - turno `reservado`: al abrir, "Emitir factura C" ya está deshabilitado con el motivo; "Ver factura" muestra la vista previa con el aviso;
  - turno ya facturado: al abrir, "Emitir factura C" ya está deshabilitado con la nota y el comprobante no se dibuja hasta "Ver factura";
  - carrera: abrir la ventana, emitir el mismo turno desde otra pestaña y tocar "Emitir" → se muestra la factura existente con la nota (409);
  - con `prefers-reduced-motion: reduce` la ventana aparece sin animación; sin `turnoId` los dos botones están deshabilitados.
  - **Verificado 2026-11-25 (team lead)** en el navegador integrado, con `SIM_NOW=2026-12-01T08:00:00-03:00`. La API devolvió vista previa 200 para atendido (`emitible: true`, `numero`/`cae` null), vista previa 200 para reservado (`emitible: false`, RN-SM-03), 403 para odontólogo y 404 para turno inexistente. En la pantalla: la vista previa rotulada tenía `—`; Cancelar (Enter) y `Escape` cerraron sin emitir y devolvieron el foco a "Emitir factura C"; "Emitir" emitió 00001-00000001, lo que confirma que la vista previa no consumió número. Al recargar, Emitir estaba deshabilitado con la nota y el comprobante oculto hasta "Ver factura". El turno reservado tenía Emitir deshabilitado con el motivo. En la carrera, la emisión por API mientras la ventana estaba abierta dio 00001-00000002, y al confirmar la pantalla mostró esa factura y la nota. Sin `turnoId`, ambos botones estaban deshabilitados. Edge headless con `--force-prefers-reduced-motion` dio `animation-name: none` en la ventana abierta.
  - **Ajuste durante la verificación**: "Ver factura" quedaba debajo de "Emitir factura C" porque la columna medía 290 px y los botones necesitan 306 px. Se ensanchó la columna izquierda de `/sim/arca.html` de 340 a 380 px, y ahora quedan al lado como pide el spec, también a 390 px y sin scroll horizontal.
- [x] 7.3 Dejar el handoff en `knowledge-base/entrega/arca-ver-factura-y-confirmar-emision.md`: qué se hizo, cómo se verificó, el aviso al Integrante 5 (zona de C-12) y las decisiones Q-1..Q-3 (resueltas por el team lead) del design y las que sigan abiertas.
