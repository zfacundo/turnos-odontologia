# Tasks

> TDD estricto: test rojo con nombre "dado … cuando … entonces …" → mínimo código verde → refactor. Sin mocks de dominio ni repositorios: seed real en memoria, padrón ficticio real y `RelojFijo` en `2026-11-30T09:00:00-03:00`. Zona: `src/simulators/whatsapp/`, `public/bot.html`, `public/js/bot.js`, `tests/simulators/whatsapp/`; fuera de Zona y aditivo: una línea en `public/js/agenda.js` (D6). **No arrancar el apply hasta que los mockups estén aprobados** (`mockups/README.md` con `Approval: approved`).
>
> Criterio de aceptación visual: `mockups/bot-sena.html` y `mockups/bot-obra-social.html`, con sus capturas en `mockups/previews/`.

## 1. Conversación pura

- [x] 1.1 Safety net: correr `npm test` en la rama y registrar la línea de base.
- [x] 1.2 Tests de menú y revisión de horario en `conversacion.test.ts`: el menú tiene "Pedir un turno", "Ver mi turno" y "Consultar mi obra social"; elegir un hueco responde el resumen con "Confirmar turno" / "Volver atrás" sin efecto; "Confirmar turno" declara `identificarPorTelefono`; "Volver atrás" repite los mismos horarios. Actualizar los tests de C-06 que asumían reserva directa. Implementar D1 hasta verde.
- [x] 1.3 Tests de gestión: opciones "Confirmo", "Pagar seña", "Cancelar turno" (sin seña) y "Confirmo", "Cancelar turno" + "Seña pagada" (señado); `cambiar` cae en "No entendí". Borrar los tests de "Necesito cambiarlo". Implementar D3 hasta verde.
- [x] 1.4 Tests de seña: tras reservar se ofrece "Pagar seña"; "Pagar seña" muestra el monto ficticio y las 3 opciones; aprobar/rechazar declaran `pagarSena`; resultado aprobado → tarjeta "Seña pagada"; rechazado → aviso + "Pagar seña"; RN-SM-01 → "ya tiene la seña pagada". Implementar D2 hasta verde.
- [x] 1.5 Tests de obra social: "Consultar mi obra social" pide texto; el texto normalizado declara `consultarObraSocial`; afiliado → tarjeta con los 5 datos; no encontrado → re-pregunta; falla → aviso y "Volver al menú"; "menú" sigue volviendo al inicio. Implementar D5 hasta verde.

## 2. Orquestación y API

- [x] 2.1 Tests en `bot.test.ts` con el seed real: reserva → seña aprobada deja `senado: true` en el repositorio de turnos y un intento aprobado en el repositorio de pagos; rechazada no cambia el turno; turno ya señado → RN-SM-01 sin segundo pago aprobado; "Volver atrás" no crea turnos; "Ver mi turno" de un turno señado no ofrece pagar; `AF-0001`, `af-0002`, `AF-9999` y `AF-0004` con el padrón real. Implementar D4 en `bot.ts` y `router.ts` hasta verde.
- [x] 2.2 Tests de `api.test.ts`: menú con 3 opciones, recordatorio con "Confirmo", "Pagar seña" y "Cancelar turno", y flujo HTTP de seña que se ve en `GET /api/turnos` con `senado: true`. Verde.
- [x] 2.3 `sin-red.test.ts` sigue en verde (los imports nuevos no traen red).

## 3. Pantallas

- [x] 3.1 Test en `pantalla.test.ts`: `agenda.js` contiene "Seña pagada" condicionado a `senado`. Agregar la línea de D6 y los estilos de D7 en `bot.js` hasta verde.
- [x] 3.2 Verificación visual contra los mockups aprobados a 390×844 y 1440×900 (`SIM_NOW=2026-11-30T09:00:00-03:00`): reserva con "Volver atrás" → "Confirmar turno" → seña aprobada; seña rechazada; obra social `AF-0001`; agenda con "Seña pagada". Capturas en `mockups/verify/`, consola y requests revisadas, `Visual verify:` en `design.md`. Detener el servidor.

## 4. Verificación integral

- [x] 4.1 `npm test` sin fallos nuevos respecto de 1.1 y `npm run typecheck` limpio. Cada escenario de las specs del change tiene al menos un test.
- [x] 4.2 `openspec validate bot-whatsapp-sena-y-obra-social --strict` y `git diff --name-only master` solo con Zona, `agenda.js` (D6), el change y el handoff.

## Workflow follow-up

- Handoff en `knowledge-base/entrega/C-06b.md`.
- PR a `master` con la plantilla, solo con autorización de Integrante 2, avisando al team lead del cambio en `agenda.js`.
- Después del merge: `/opsx:archive`.
