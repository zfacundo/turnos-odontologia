# Handoff — `panel-boton-emitir-factura`

- **Modo**: SDD (OPSX). Rama `panel-boton-emitir-factura`. Sin commit todavía.
- **Fecha**: 2026-11-25

## Qué se hizo

Acción "Emitir factura" en el detalle del turno de la agenda del panel, para recepción y admin (mismo comportamiento; Q-1 resuelta).
- Turno `atendido`: enlace `<a class="btn btn-secondary">` a `/sim/arca.html?turnoId=<id>` (id con `encodeURIComponent`), misma pestaña, sin llamar a la API.
- Otro estado: `<a>` sin `href`, `role="link"`, `aria-disabled="true"`, y texto visible "Disponible cuando el turno esté atendido".
- El odontólogo no la ve. El mensaje "sin acciones" no aparece si la acción es visible.

Archivos:
- `public/admin/js/permisos-ui.js` y `.d.ts`: `puedeEmitirFactura(rol)`.
- `public/admin/js/agenda-calculos.js` y `.d.ts`: `accionFactura(rol, turno)` y tipo `AccionFactura`.
- `public/admin/js/agenda.js` (`dibujarDetalle`): cableado, solo con `h(...)`.
- `public/admin/admin.css`: `.btn[aria-disabled="true"]` sumado a la regla de `.btn[disabled]` (aditivo).
- Tests: `tests/panel/permisos-ui.test.ts` y `tests/panel/agenda-calculos.test.ts`.

## Cómo se verificó

- Strict TDD: RED visto (`is not a function`) y GREEN en cada función pura.
- `npx vitest run`: 1141 tests de baseline -> 1151 en verde; `npm run typecheck` limpio; `estatico-admin.test.ts` en verde.
- Verificación manual en el navegador (tarea 4.2): hecha por el team lead el 2026-11-25. Se probó recepción con turno atendido (enlace, navegación y emisión de la Factura C) y con turno sin confirmar (deshabilitado con ayuda, `Tab` lo saltea, `Escape` cierra). Admin y odontólogo no veían el botón (antes de Q-1). El detalle está en `tasks.md` 4.2.
- Q-1 (admin incluido): TDD en rojo y verde; `npx vitest run` 1151 -> 1152 tests en verde y `npm run typecheck` limpio. Verificación manual como admin (tarea 5.3) hecha por el team lead el 2026-11-25: enlace activo en el turno atendido, que abre Factura C con el turno precargado; desactivado con ayuda en el turno sin confirmar.

## Decisiones abiertas

- **Q-1 (resuelta, 2026-11-25, team lead)**: admin también ve "Emitir factura", con el mismo comportamiento que recepción. Odontólogo sigue sin verla. No quedan decisiones abiertas.
