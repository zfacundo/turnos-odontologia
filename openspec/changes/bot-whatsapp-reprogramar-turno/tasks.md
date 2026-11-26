> TDD estricto: en cada tarea, primero el test en rojo (nombre dado / cuando / entonces), después el mínimo código para que pase y al final el refactor. Se usan los repositorios en memoria reales del seed y `RelojFijo`; no se mockea nada más (Regla Dura 7). Reloj de los escenarios: lunes `2026-11-30 09:00` (UTC-03:00).
>
> **Bloqueo visual**: el grupo 4 (verificación de la pantalla) no arranca hasta que `mockups/README.md` diga `Approval: approved`.

## 0. Red de seguridad

- [ ] 0.1 Correr `npx vitest run tests/simulators/whatsapp tests/application/agenda` y anotar el baseline (N tests en verde). Si algo falla, frenar y reportarlo como fallo previo.

## 1. Conversación pura (`src/simulators/whatsapp/conversacion.ts`)

- [ ] 1.1 RED/GREEN: en `tests/simulators/whatsapp/conversacion.test.ts`, "dado un turno sin seña en el paso gestion cuando se muestra entonces las opciones son Confirmo, Pagar seña, Cambiar horario y Cancelar turno", más la variante con seña (sin "Pagar seña"). Agregar `OP.cambiar` y actualizar `opcionesTurno()`. Verifica: tests en verde.
- [ ] 1.2 RED/GREEN: "dado el paso gestion cuando elige Cambiar horario entonces declara el efecto verificarCambio con el id del turno". Sumar `prestacionId`/`profesionalId` a `TurnoResumen` (D2), `objetivo` a `Sesion` (D3) y `verificarCambio` a `Efecto`/`ResultadoEfecto` (D4). Verifica: test en verde y `npx tsc --noEmit` sin errores.
- [ ] 1.3 RED/GREEN/TRIANGULATE: `resolver('verificarCambio')`. Si está permitido, declara `buscarHuecos` con la prestación y el profesional del turno. Con `RN-AG-06`, responde "Faltan menos de 24 h…" con "Volver al menú" y sin horarios. Con `RN-AG-09`/`no-encontrado`, responde "No pude cambiar el turno. Comunicate con recepción.". Verifica: 3 tests en verde.
- [ ] 1.4 RED/GREEN: con `objetivo: 'reprogramar'`, elegir un hueco lleva a `revisarCambio` con el resumen antes/ahora y exactamente "Confirmar cambio"/"Volver atrás". "Volver atrás" vuelve a los mismos horarios. "Ver más días" sigue funcionando. Verifica: tests en verde.
- [ ] 1.5 RED/GREEN/TRIANGULATE: "Confirmar cambio" declara `reprogramar { turnoId, inicio, sillonId }`. `resolver('reprogramar')` sigue la tabla D5: ok → tarjeta "Turno reprogramado" (con "Seña pagada" si `senado` y la línea del horario liberado); `RN-AG-02` → aviso `ocupado` y nueva búsqueda; `RN-AG-05` → aviso `pacienteOcupado`; `RN-AG-06` → recepción; otros → "No pude cambiar el turno…". Verifica: un test por fila, en verde.
- [ ] 1.6 RED/GREEN: sin huecos en 14 días con `objetivo: 'reprogramar'` → mensaje "…Tu turno sigue igual." con "Volver al menú". La reserva normal mantiene su mensaje actual. Verifica: 2 tests en verde.
- [ ] 1.7 REFACTOR: unificar la elección de hueco según `objetivo` sin duplicar `mostrarHorarios`/`buscarHuecos`. Verifica: toda la suite de `conversacion.test.ts` en verde.

## 2. Ejecución con los casos de uso reales (`src/simulators/whatsapp/bot.ts`)

- [ ] 2.1 RED/GREEN: en `tests/simulators/whatsapp/bot.test.ts`, "dado un turno de pac-01 el martes 10:00 cuando elige Ver mi turno y Cambiar horario entonces ofrece exactamente los 3 primeros huecos de consultarHuecos de prest-control con prof-1 más Ver más días". Implementar `verificarCambio` con `validarVentanaCancelacion` y completar `resumen()` con los ids. Verifica: test en verde.
- [ ] 2.2 RED/GREEN: escenario feliz. Cambiar a "Lun 30/11 09:30" → mismo id de turno, `inicio` 09:30, `fin` 10:00, `estado`/`origen`/`senado` iguales, un solo turno de `pac-01`, tarjeta "Turno reprogramado". Implementar el efecto `reprogramar` con `reprogramarTurno` (sin `profesionalId`). Verifica: test en verde.
- [ ] 2.3 RED/GREEN: "dado el cambio realizado cuando recepción crea otro turno con prof-1 en sillon-1 el martes 10:00 entonces se crea" (el horario anterior queda libre). Verifica: test en verde.
- [ ] 2.4 RED/GREEN: turno señado → sigue `senado: true` y la tarjeta dice "Seña pagada". Verifica: test en verde.
- [ ] 2.5 RED/GREEN/TRIANGULATE: ventana. Turno del lunes 15:00 → deriva a recepción, sin horarios y sin cambios. Turno del martes 09:00 (justo 24 h) → ofrece horarios. Verifica: 2 tests en verde.
- [ ] 2.6 RED/GREEN: carreras. (a) Recepción ocupa 09:30 entre medio → "Ese horario ya se ocupó…", re-oferta sin 09:30 y el turno sigue el martes 10:00. (b) `pac-01` con otro turno de `prof-2` el lunes 09:30 → "Ya tenés otro turno a esa hora…". (c) Recepción cancela el turno antes de confirmar → "No pude cambiar el turno…" y sigue `cancelado`. Verifica: 3 tests en verde.
- [ ] 2.7 RED/GREEN: "Ver más días" al cambiar → los 3 primeros huecos del martes según `consultarHuecos`. Profesional sin franjas → "…Tu turno sigue igual.". Verifica: tests en verde.
- [ ] 2.8 RED/GREEN: auditoría. Después del cambio, `deps.auditoria` tiene un evento `reprogramar` del turno con `rol: 'paciente'` y `usuarioId` que empieza con `whatsapp:`. Verifica: test en verde.
- [ ] 2.9 Actualizar los tests existentes que fijan "las 3 opciones" de "Ver mi turno", "Turno señado no ofrece pagar" y "Recordatorio con opciones" (ahora con "Cambiar horario"), renombrándolos según el spec. Verifica: `npx vitest run tests/simulators/whatsapp` en verde.

## 3. Contrato de la API y sin red

- [ ] 3.1 RED/GREEN: en `tests/simulators/whatsapp/api.test.ts`, el flujo completo por `POST /api/sim/whatsapp/mensaje` ("Ver mi turno" → `cambiar` → hueco → "Confirmar cambio") responde `200` con `simulado: true` y el aviso, y `GET /api/turnos` muestra el turno movido. Verifica: test en verde.
- [ ] 3.2 Confirmar que `tests/simulators/whatsapp/sin-red.test.ts` sigue en verde sin cambios (no se importan `http`/`https`/`net` ni se usa `fetch`). Verifica: test en verde.

## 4. Pantalla (después de la aprobación del mockup)

- [ ] 4.1 Con `npm run dev`, recorrer en `/bot.html` el flujo de `mockups/bot-reprogramar.html` (feliz, <24 h, horario ocupado) a 390 y 1440 px, y comprobar que coincide con el mockup aprobado sin tocar `public/bot.html` ni `public/js/bot.js`. Verifica: capturas en `mockups/verify/`. Si hace falta tocar la pantalla, volver a Propose (D6).

## 5. Cierre

- [ ] 5.1 Correr `npm test` y `npx tsc --noEmit`. Verifica: todo en verde, sin `any` nuevos.
- [ ] 5.2 Dejar el handoff en `knowledge-base/entrega/` y marcar en la descripción del PR que necesita la revisión del team lead y del Integrante 2 (zona C-06).
