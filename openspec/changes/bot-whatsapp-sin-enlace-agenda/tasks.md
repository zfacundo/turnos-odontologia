## 1. Mockup

- [x] 1.1 Mockup `mockups/bot-sin-agenda.html` con el encabezado sin "Agenda"; capturas a 390 y 1440
- [x] 1.2 Aprobación del mockup registrada en `design.md`

## 2. Implementación

- [x] 2.1 Test en rojo en `pantalla.test.ts`: `/bot.html` no enlaza a `/admin/` ni muestra "Agenda" en el encabezado
- [x] 2.2 Quitar el enlace de `public/bot.html`
- [x] 2.3 Delta de `vista-agenda` y ajuste de `tests/api/sin-enlaces-viejos.test.ts` (fuera de la Zona, revisión del team lead)

## 3. Verificación

- [x] 3.1 `npm test`, typecheck y `openspec validate bot-whatsapp-sin-enlace-agenda --strict`
- [x] 3.2 Revisar `/bot.html` en el navegador y comparar con el mockup
