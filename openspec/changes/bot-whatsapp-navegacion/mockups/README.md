# Mockups — `bot-whatsapp-navegacion`

- Design system revision: 1 (sin tokens nuevos; `.chip.nav` usa `--line` y `--muted`)
- Approval: approved (2026-11-25, by user; revisión 3)
- Preview: rendered (2026-11-25, Edge headless, tema claro, 390 y 1440 de ancho) → `previews/`

## Pantallas y estados

| Mockup | Pantalla | Estados |
|---|---|---|
| `bot-navegacion.html` | `public/bot.html` | Profesional con fila de navegación; menú sin cambios; horarios; datos del paciente (texto + navegación); pantalla de pago; después de reservar (sin "Volver atrás"); confirmar el número de afiliado |

## Cómo verlos

Desde la raíz del repo: `python -m http.server 8765 --bind 127.0.0.1` y abrir
`http://127.0.0.1:8765/openspec/changes/bot-whatsapp-navegacion/mockups/bot-navegacion.html`.
