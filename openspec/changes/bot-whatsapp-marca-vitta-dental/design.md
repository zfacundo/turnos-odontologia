## Context

`public/bot.html` escribe el nombre del producto a mano en `<title>` y en el encabezado (`<header class="top"><strong>`). No carga `brand.js`, así que no tomó el cambio de marca del panel.

## Goals / Non-Goals

**Goals:** que el bot muestre "Vitta Dental" como el panel.

**Non-Goals:** agregar el logo al bot, cambiar "Consultorio (TBD)" ni cambiar las otras pantallas de simuladores.

## Decisions

### D1. Texto fijo en lugar de cargar `brand.js`
`brand.js` se sirve solo en `/admin/brand.js`. Cargarlo desde el bot crearía una dependencia del bot con el panel, así que se cambia el texto en el HTML.

## Risks / Trade-offs

- Un cambio de marca futuro tiene que tocar también `bot.html`.

## UI Mockups

- Design system revision: 2
- Decision: yes (2026-11-26)
- Mockups: `openspec/changes/bot-whatsapp-marca-vitta-dental/mockups/`
- Approval: approved (2026-11-26, by user)
- Preview: rendered (2026-11-26, `mockups/previews/bot-marca-390.png`, `bot-marca-1440.png`)
- Visual verify: passed (2026-11-26). `/bot.html` en el panel del navegador muestra "Vitta Dental" en el encabezado y en la pestaña, como en el mockup (`mockups/verify/bot-marca-1440.jpg`).
