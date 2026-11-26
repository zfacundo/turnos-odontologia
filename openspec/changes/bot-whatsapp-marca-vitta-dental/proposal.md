## Why

El panel ya muestra la marca Vitta Dental (design system revisión 2, PR #34), pero la pantalla del bot de WhatsApp simulado (`/bot.html`) sigue diciendo "Turnos Odontología". Integrante 2 pidió el 2026-11-26 cambiar ese nombre por "Vitta Dental".

## What Changes

- Encabezado de `/bot.html`: "Turnos Odontología" → "Vitta Dental".
- Título de la pestaña: "Bot de WhatsApp (simulación) | Vitta Dental".
- No cambian el chat, la cabecera "Consultorio (TBD)" ni la API.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna: ninguna spec menciona el nombre del producto (`skip_specs: true`).

## Impact

- `public/bot.html` (Zona del bot).
- `tests/simulators/whatsapp/pantalla.test.ts`: un test nuevo que verifica el nombre.
