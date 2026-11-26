## Context

El encabezado de `public/bot.html` tiene `<nav aria-label="Secciones">` con dos enlaces: "Agenda" y "Bot WhatsApp (sim.)" (`aria-current="page"`).

## Goals / Non-Goals

**Goals:** quitar el enlace a la agenda del encabezado del bot.

**Non-Goals:** cambiar el panel de recepción, el chat ni la API.

## Decisions

### D1. Se quita solo el enlace "Agenda"
El `<nav>` queda con "Bot WhatsApp (sim.)", que indica la página actual. Los estilos de `.top nav` no cambian, así que el rótulo sigue alineado a la derecha.

### D2. Ajuste del requisito del panel
`vista-agenda` pedía el enlace en el bot ("Navegación desde el bot") y `tests/api/sin-enlaces-viejos.test.ts` lo verificaba para `bot.html` y `sim/arca.html`. Integrante 2 autorizó el 2026-11-25 modificar ambos: el escenario "Navegación desde el bot" pasa a exigir que el bot no tenga enlace "Agenda" y el test sigue verificando `sim/arca.html`. El resto del requisito (ningún enlace a `/` ni `/index.html`) no cambia.

## Risks / Trade-offs

- Para ir a la agenda desde el bot hay que escribir la dirección `/admin/`. Es lo esperado: la pantalla representa el teléfono del paciente.

## UI Mockups

- Design system revision: 1
- Decision: yes (2026-11-25)
- Mockups: `openspec/changes/bot-whatsapp-sin-enlace-agenda/mockups/`
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, `mockups/previews/bot-sin-agenda-390.png`, `bot-sin-agenda-1440.png`)
- Visual verify: passed (2026-11-25). `/bot.html` en el panel del navegador: arriba a la derecha queda solo "Bot WhatsApp (sim.)", como en el mockup (`mockups/verify/bot-sin-agenda-1440.jpg`). El logo provisional del mockup no está en la pantalla real; eso ya era así antes de este change.
