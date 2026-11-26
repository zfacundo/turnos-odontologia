# Handoff — `arca-ver-factura-y-confirmar-emision`

- **Modo**: SDD (OPSX). Rama `panel-boton-emitir-factura` (trabajo sin commitear). Sin commit todavía.
- **Fecha**: 2026-11-25
- **Estado**: implementado, probado y verificado en el navegador (tarea 7.2, team lead, 2026-11-25).

## Qué se hizo

Pantalla del simulador de ARCA (`/sim/arca.html`, C-12) con botón "Ver factura" y ventana de confirmación antes de emitir.

- **API**: `GET /api/sim/arca/facturas/:turnoId` (roles `admin` y `recepcion`; `403` si no; `404` si el turno no existe). Turno facturado -> `estado: "emitida"` con la factura; si no -> `estado: "vista-previa"` con un borrador (`numero`, `cae` y `vencimientoCae` en `null`), `emitible` y, si no es emitible, `motivo` `RN-SM-03`. No guarda, no consume número y no audita.
- **Dominio** (`facturaC.ts`): `CuerpoFacturaC`, `BorradorFacturaC`, `armarCuerpoFacturaC`, `armarBorradorFacturaC`. `FacturaC` conserva los mismos campos (el `POST` no cambia).
- **Aplicación**: `comprobanteDelTurno.ts` (`entradaDelComprobante`, `puedeOperarFacturas`, compartidos), `verFacturaC.ts` (sin `auditoria` ni `guardar` en sus dependencias, por tipo) y refactor de `emitirFacturaC.ts` para usar lo compartido.
- **Pantalla**: botón "Ver factura"; vista previa rotulada "VISTA PREVIA — no emitida" con "—" y sin "Imprimir"; `<dialog>` "¿Emitir Factura C?" (`showModal()`, `aria-labelledby`, foco en "Cancelar", `Escape` y "Cancelar" cierran sin emitir, el foco vuelve a "Emitir factura C", fundido de 120 ms anulado con `prefers-reduced-motion`). Solo `textContent`, sin `innerHTML`, sin URLs absolutas.
- **Decisiones del team lead (2026-11-25)**: Q-1 al cargar la página se consulta la factura una vez (emitida -> "Emitir factura C" deshabilitado con la nota "Este turno ya tiene factura", el comprobante se ve solo con "Ver factura"; no emitible -> deshabilitado con el motivo; emitible -> habilitado). Q-2 la ventana nunca se abre para un turno no emitible y su "Emitir" se deshabilita si lo estuviera. Q-3 ante `409 ya facturado` se consulta y muestra la factura existente, se deshabilita el botón y se muestra la nota.

Archivos: `src/simulators/arca/{facturaC,emitirFacturaC,router}.ts`, nuevos `comprobanteDelTurno.ts` y `verFacturaC.ts`, `public/sim/arca.html`; tests en `tests/simulators/arca/` (`facturaC`, `comprobanteDelTurno`, `verFacturaC`, `api`, `pantalla`).

## Cómo se verificó

- Strict TDD: RED visto y GREEN en cada tarea; un test por escenario del spec con nombre "dado / cuando / entonces". Repositorios en memoria reales, `RelojFijo` y `AuditoriaEnMemoria`, sin mocks.
- `npx vitest run`: 1152 tests de baseline -> 1193 en verde; `npm run typecheck` limpio; `openspec validate arca-ver-factura-y-confirmar-emision --strict` válido. `tests/api/admin-estaticos.test.ts`, `sin-enlaces-viejos.test.ts` y `sin-red.test.ts` siguen en verde. El único test existente modificado es el de llamadas `fetch` de `pantalla.test.ts` (lo pide el requisito modificado).
- El comportamiento interactivo (modal, foco, `Escape`, 409 por carrera) no tiene entorno DOM en el proyecto: los tests de pantalla son estáticos (regex sobre el HTML). El script del HTML se revisó con `node --check`.
- **Navegador (7.2)**: hecha por el team lead el 2026-11-25. Se probó vista previa, confirmación (Cancelar, Escape, Emitir), estado inicial con factura o turno no atendido, carrera 409, sin `turnoId` y `prefers-reduced-motion` forzado. Durante la prueba se ensanchó la columna izquierda (340 → 380 px) para que "Ver factura" quede al lado de "Emitir factura C". El detalle está en `tasks.md` 7.2.

## Qué sigue

- Archivar el change.
- **Aviso para el Integrante 5**: `src/simulators/arca/` y `public/sim/arca.html` son su zona (C-12). Los cambios son aditivos salvo el refactor de `emitirFacturaC.ts` (el `POST` no cambia) y el ajuste de un test de `pantalla.test.ts`. Hay que pasarle el handoff antes de mergear.

## Decisiones abiertas

- Ninguna de las Q-1..Q-3 (resueltas). Detalle menor: si la consulta inicial de la pantalla falla (red o `403`), se muestra el error y los botones quedan habilitados, porque el servidor decide al emitir.
- La fecha de la vista previa es la del reloj al consultar; si se emite otro día, el comprobante real tendrá otra fecha.
