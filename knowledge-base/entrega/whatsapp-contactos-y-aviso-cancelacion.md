# Handoff — `whatsapp-contactos-y-aviso-cancelacion`

- **Rama**: `confirmacion-turno-whatsapp` (trabajo sin commitear, aceptado por el team lead el 2026-11-26)
- **Change OPSX**: `openspec/changes/whatsapp-contactos-y-aviso-cancelacion/`
- **Estado**: implementado y verificado en el navegador (tarea 7.2, team lead, 2026-11-26).

## Qué se hizo

- **A (privacidad, governance HIGH).** `GET /api/sim/whatsapp/contactos` ya no devuelve `telefono`: devuelve `{ id, nombre, telefonoEnmascarado }` (formato de `pacientePublico`, p. ej. `+54 9 11 0000-**01`). `POST /mensaje`, `POST /recordatorio` y `GET /avisos` aceptan **exactamente uno** de `telefono` o `pacienteId` (si no, `400 entrada`); con `pacienteId` el servidor resuelve el teléfono. Nuevo `src/simulators/whatsapp/contactoSimulado.ts` (`contactoPublico`, `resolverTelefono`). `public/js/bot.js` usa el `id` como valor del selector, muestra `telefonoEnmascarado · nombre` y manda `pacienteId` en chat, recordatorio 24 h y sondeo de avisos.
- **B (MEDIUM).** Nuevo `src/simulators/whatsapp/cancelacionTurno.ts` (`mensajeCancelacionTurno` pura y `registrarAvisoCancelacionTurno`, que nunca lanza). `POST /api/turnos/:id/cancelar` queda con una sola llamada antes del `200`. Texto y condiciones idénticos a los anteriores.

## Decisiones

- **Q-1 aprobada (opción 1) por el team lead el 2026-11-26.** Q-2: se conserva `registrarAvisoCancelacion` (lo usa el módulo nuevo como valor por defecto). Q-3: fuera de alcance.

## Zonas y contrato (aviso a Integrantes 2 y 4)

- **Cambio de contrato** en la zona del simulador de WhatsApp (Integrante 2) y la pantalla del bot (Integrante 4): `/contactos` pasa de `telefono` a `telefonoEnmascarado`. Único consumidor conocido: `public/js/bot.js` (actualizado). `telefono` sigue aceptándose en mensaje/recordatorio/avisos.
- Archivos compartidos tocados: `src/api/routes/turnos.ts` (solo la ruta de cancelar + import), `src/simulators/whatsapp/router.ts`, `public/js/bot.js`.

## Cómo se verificó

- `npx vitest run`: línea base 1309 → 1341 en verde. `npm run typecheck`: limpio.
- Tests nuevos: `tests/simulators/whatsapp/cancelacionTurno.test.ts`, `contactoSimulado.test.ts`, `contactos.test.ts`, `tests/api/aviso-cancelacion-whatsapp.test.ts`; ajustada solo la aserción del separador en `pantalla.test.ts` (+3 tests de pantalla).
- Navegador (7.2): hecho. Selector enmascarado con valor `pac-01`; reserva, recordatorio y sondeo por `pacienteId`. La cancelación desde el panel llega al bot con el texto exacto y otro contacto no la ve. Detalle en `tasks.md` 7.2.

## Preguntas abiertas

- Q-3: unificar el formateador de fecha de confirmación y cancelación (hoy duplicado como constante).
- Sin login, cualquiera puede hablar como `pac-01` conociendo su id (igual que antes con el teléfono).
