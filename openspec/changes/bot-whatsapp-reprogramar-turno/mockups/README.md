# Mockups — `bot-whatsapp-reprogramar-turno`

- Design system revision: 1 (`design-system/`, aprobado el 2026-11-25). **No se modifica**: no hay tokens ni componentes nuevos.
- Approval: **pending**. Bloquea la tarea 4.1 de `tasks.md`.
- Preview: not rendered yet (se generan en `previews/` a 390 y 1440 de ancho cuando se revise).

## Pantallas y estados

| Mockup | Pantalla real | Estados que muestra |
|---|---|---|
| `bot-reprogramar.html` | `public/bot.html` | Flujo feliz: "Ver mi turno" → "Cambiar horario" → 3 horarios + "Ver más días" → resumen antes/ahora ("Confirmar cambio" / "Volver atrás") → tarjeta "Turno reprogramado". Variantes: opciones de "Ver mi turno" con el chip nuevo, menos de 24 h (deriva a recepción), horario tomado entre medio, ya tiene otro turno a esa hora, turno señado reprogramado, turno ya no activo / sin horarios, recordatorio 24 h con "Cambiar horario" |

- El cambio visual es solo de **contenido** del chat: un chip nuevo, el resumen y la tarjeta usan los estilos existentes (`.chip`, `.b.bot`, `.b.card-msg`, `.b.alerta`). `public/bot.html` y `public/js/bot.js` no cambian (design D6).
- "Cambiar horario" usa el estilo normal del chip, no `danger`. Va entre "Pagar seña" y "Cancelar turno", así la acción destructiva queda última.
- Las variantes debajo del chat principal son estados de referencia: la pantalla real muestra una sola conversación.
- Datos ficticios del seed: `Paciente Ficticio Uno` (`+54 9 11 0000-0001`), `Dra. Ficticia Perez`, "Control y limpieza". Reloj de ejemplo: lunes 30/11 09:00.

## Para decidir en la revisión

- Rótulo del chip: "Cambiar horario" (propuesto) o "Necesito cambiarlo" (CHANGES.md).

## Fuentes

- `design-system/tokens.css`, `brand.js`, `assets/logo.svg` (revisión 1).
- `bot.css` copiado sin cambios de los mockups archivados de `bot-whatsapp-sena-y-obra-social`.
- `specs/bot-whatsapp/spec.md` de este change.

## Cómo verlos

Desde la raíz del repo: `python -m http.server 8765 --bind 127.0.0.1` y abrir
`http://127.0.0.1:8765/openspec/changes/bot-whatsapp-reprogramar-turno/mockups/bot-reprogramar.html`.
