## Why

La pantalla del bot de WhatsApp simulado (`/bot.html`) tiene arriba a la derecha un enlace "Agenda" que lleva al panel de recepción. La pantalla simula el teléfono del paciente, y ese enlace saca al usuario del chat. Integrante 2 pidió quitarlo el 2026-11-25.

## What Changes

- Se quita el enlace "Agenda" (`/admin/#/agenda`) del encabezado de `public/bot.html`.
- Arriba a la derecha queda solo "Bot WhatsApp (sim.)" como página actual.
- El chat, la API y los rótulos de simulación no cambian.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `vista-agenda`: el requisito "Retiro de la agenda anterior" (del change `panel-reemplaza-agenda-vieja`) exigía el enlace "Agenda" en el bot con el escenario "Navegación desde el bot". Se reescribe ese escenario: ahora exige que el bot NO tenga enlace "Agenda". **Fuera de la Zona del bot: necesita revisión del team lead.**

## Impact

- `public/bot.html` (Zona del bot).
- `tests/simulators/whatsapp/pantalla.test.ts`: un test nuevo que verifica que la pantalla no enlaza a la agenda.
- `tests/api/sin-enlaces-viejos.test.ts` (fuera de la Zona, del panel): el chequeo del enlace "Agenda" queda solo para `sim/arca.html`.
