# Mockups — C-06 `bot-whatsapp-simulado`

- Design system revision: 1 (`design-system/`, aprobado el 2026-11-25)
- Approval: approved (2026-11-25, by user)
- Preview: rendered (2026-11-25, Edge headless, tema claro, 390 y 1440 de ancho)

## Pantallas y estados

| Mockup | Pantalla | Estados que muestra |
|---|---|---|
| `bot-reserva.html` | `public/bot.html` | Reserva desde un número nuevo (menú → tipo → profesional → horarios → nombre y DNI → tarjeta "Turno reservado"); horarios ofrecidos (3 + "Ver más días"); horario tomado entre medio |
| `bot-gestion.html` | `public/bot.html` | Recordatorio 24 h → Confirmo → "Turno confirmado"; opciones del turno (Confirmo / Necesito cambiarlo / Cancelar turno); cancelar con menos de 24 h; "Necesito cambiarlo" derivado a recepción |

Layout: en escritorio, el panel de control (teléfono ficticio y botón de recordatorio) va a la izquierda y el chat a la derecha. En mobile se apilan, con el panel arriba. Las variantes que aparecen debajo del chat principal son estados de referencia: la pantalla real muestra una sola conversación.

## Fuentes

- `design-system/tokens.css`, `brand.js` y `assets/logo.svg` (revisión 1).
- `docs/discovery/prototipo/agenda_odontologia.html`, escenas 1 y 2.
- `openspec/changes/bot-whatsapp-simulado/specs/bot-whatsapp/spec.md` (textos y opciones).
- (TBD) heredados del design system: logo y nombre del consultorio.

## Cómo verlos

Desde la raíz del repo:

```
python -m http.server 8765 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8765/openspec/changes/bot-whatsapp-simulado/mockups/bot-reserva.html` y `.../bot-gestion.html`. Las capturas están en `previews/`.
