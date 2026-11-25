# Mockups — `bot-whatsapp-sena-y-obra-social`

- Design system revision: 1 (`design-system/`, aprobado el 2026-11-25)
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, Edge headless, tema claro, 390 y 1440 de ancho) → `previews/`

## Pantallas y estados

| Mockup | Pantalla | Estados que muestra |
|---|---|---|
| `bot-sena.html` | `public/bot.html` (+ tarjeta de `public/js/agenda.js`) | Horario elegido → resumen con "Confirmar turno" / "Volver atrás" → "Turno reservado" → "Pagar seña" → pago aprobado ("Seña pagada"); pantalla de pago; pago rechazado; "Ver mi turno" sin seña y señado (sin "Necesito cambiarlo"); tarjeta de la agenda con "Seña pagada" |
| `bot-obra-social.html` | `public/bot.html` | Menú con 3 opciones; "Consultar mi obra social" → AF-0001 → tarjeta con obra social, plan, cobertura, copago y estado; número inexistente; falla simulada del padrón |

Las variantes debajo del chat principal son estados de referencia: la pantalla real muestra una sola conversación.

## Fuentes

- `design-system/tokens.css`, `brand.js`, `assets/logo.svg` (revisión 1); `bot.css` heredado de C-06 con dos estilos nuevos (lista de cobertura y marca de seña).
- `specs/bot-whatsapp/spec.md` y `specs/vista-agenda/spec.md` de este change.
- Padrón ficticio de C-08 (`AF-0001..0004`) y monto ficticio de C-11 ($5.000).

## Cómo verlos

Desde la raíz del repo: `python -m http.server 8765 --bind 127.0.0.1` y abrir
`http://127.0.0.1:8765/openspec/changes/bot-whatsapp-sena-y-obra-social/mockups/bot-sena.html` (o `bot-obra-social.html`).
