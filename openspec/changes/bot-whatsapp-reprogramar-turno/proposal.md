## Why

El bot de WhatsApp SIMULADO (C-06) reserva, confirma, cancela y cobra la seña, pero no permite cambiar el horario: RN-WA-02 y RN-WA-03 piden que el paciente pueda reprogramar por el mismo canal, y CHANGES.md dejó la opción "Necesito cambiarlo" pendiente hasta que C-04 (`reprogramarTurno`) estuviera listo. C-04 ya está archivado (`POST /api/turnos/:id/reprogramar`), así que el plan B del camino crítico ("bot sin reprogramar") se puede cerrar.

## What Changes

- "Ver mi turno" y el recordatorio de 24 h suman la opción **"Cambiar horario"** (entre "Pagar seña" y "Cancelar turno"). Reemplaza el rótulo "Necesito cambiarlo" de CHANGES.md por uno más claro; ver la decisión D1 en `design.md`.
- "Cambiar horario" revisa primero la ventana de 24 h (RN-AG-06/RN-AG-08). Si faltan menos de 24 h, el bot responde que se comunique con recepción y el turno no cambia.
- Fuera de la ventana, el bot ofrece hasta 3 huecos libres de `consultarHuecos` para la **misma prestación y el mismo profesional** del turno, más "Ver más días" (RN-WA-01). Al elegir uno, muestra un resumen antes/ahora con "Confirmar cambio" y "Volver atrás".
- "Confirmar cambio" reprograma con el **mismo caso de uso que recepción** (`reprogramarTurno`, rol paciente, RN-WA-02): mismo turno (mismo id, paciente, prestación y profesional, se conservan seña y origen) y el horario anterior queda libre. El bot muestra la tarjeta "Turno reprogramado".
- Si el horario se ocupa entre medio (RN-AG-02/03) o el paciente ya tiene otro turno a esa hora (RN-AG-05), el bot avisa y vuelve a ofrecer horarios. Si el turno dejó de estar activo (RN-AG-09) o cruzó la ventana de 24 h mientras tanto, deriva a recepción.
- Todo sigue rotulado «SIMULACIÓN» (`simulado: true` y el aviso en la API y en la pantalla), sin llamadas de red.
- No es **BREAKING** para la API: el contrato de `POST /api/sim/whatsapp/mensaje` no cambia, solo hay ids de opción nuevos. Sí cambia la lista exacta de opciones de "Ver mi turno" y del recordatorio, que estaba fijada en el spec.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `bot-whatsapp`: "Ver mi turno" y el recordatorio ofrecen "Cambiar horario". Se agrega el requisito de cambiar el horario desde el bot, con su ventana de 24 h, la oferta de huecos, la confirmación y los errores.

## Impact

- **Código (zona C-06, Integrante 2, que debe revisar)**: `src/simulators/whatsapp/conversacion.ts` (pasos, opciones y efectos nuevos), `src/simulators/whatsapp/bot.ts` (ejecuta `reprogramarTurno` y la verificación previa de la ventana), `tests/simulators/whatsapp/*` (tests nuevos y el ajuste de los que fijan las 3 opciones de "Ver mi turno").
- **Sin cambios previstos**: `public/bot.html`, `public/js/bot.js` y `src/simulators/whatsapp/router.ts`. La pantalla dibuja de forma genérica los mensajes, las tarjetas y los chips que manda la API (ver `design.md`, D6).
- **Reutiliza sin modificar**: `src/application/agenda/reprogramarTurno.ts` (C-04), `consultarHuecos` (C-05) y `src/domain/agenda/ventanaCancelacion.ts` (C-03).
- **Auditoría**: la reprogramación queda auditada por el caso de uso existente (`accion: 'reprogramar'`, usuario `whatsapp:<tel>`, rol `paciente`). No se toca el registro de auditoría.
- **UI**: hay cambio visual, con chips y una tarjeta nueva en el chat. El mockup está en `mockups/` con `Approval: pending` (política `system-and-mockups`).
- **Governance**: MEDIUM (lógica de negocio sobre un caso de uso existente).
