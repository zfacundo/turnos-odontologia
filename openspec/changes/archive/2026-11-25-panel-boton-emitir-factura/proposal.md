## Why

Hoy, para emitir la Factura C de un turno atendido, recepción tiene que abrir `/sim/arca.html?turnoId=…` a mano y copiar el id del turno. El team lead pidió un botón **"Emitir factura"** en la agenda semanal del panel: cuando la recepcionista selecciona un turno, el botón la lleva a la pantalla de Factura C con ese turno ya elegido.

## What Changes

- El detalle del turno de la agenda semanal del panel (`/admin/#/agenda`) suma la acción **"Emitir factura"**. Va junto a las acciones que ya existen (Confirmar, Marcar atendido, Ausente, Cancelar).
- La ven los roles `recepcion` y `admin`, con el mismo comportamiento (Q-1 resuelta el 2026-11-25, team lead: admin incluido). El odontólogo no la ve.
- Si el turno está `atendido`, la acción es un enlace habilitado. Navega en la misma pestaña a `/sim/arca.html?turnoId=<id codificado>`.
- Si el turno está en cualquier otro estado, la acción se muestra deshabilitada. No navega, tiene `aria-disabled="true"` y muestra el texto de ayuda "Disponible cuando el turno esté atendido". El motivo: el simulador de ARCA rechaza los turnos que no están atendidos.
- La decisión (visible, habilitado, `href`) vive en funciones puras del panel con tests Vitest. El cableado del DOM se verifica a mano en el navegador.
- No cambian la API, el backend ni `public/sim/arca.html`. La pantalla de ARCA ya lee `?turnoId=` y preselecciona el turno.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `panel-admin`: se agregan dos requisitos para la acción "Emitir factura" en el detalle del turno de la agenda semanal. Uno dice quién la ve y a dónde navega. El otro dice que queda deshabilitada si el turno no está atendido. El requisito existente "Detalle de turno desde la agenda" no se modifica.

## Impact

- **Código** (zona del panel, Integrante 1; el cambio lo hace el team lead):
  - `public/admin/js/permisos-ui.js` y `permisos-ui.d.ts`: nueva `puedeEmitirFactura(rol)`;
  - `public/admin/js/agenda-calculos.js` y `agenda-calculos.d.ts`: nueva `accionFactura(rol, turno)`;
  - `public/admin/js/agenda.js` (`dibujarDetalle`): dibuja el enlace o el botón deshabilitado con su ayuda;
  - `public/admin/admin.css`: regla aditiva `.btn[aria-disabled="true"]`, con el mismo aspecto que `.btn[disabled]`.
- **Tests**: `tests/panel/permisos-ui.test.ts` y `tests/panel/agenda-calculos.test.ts`. `tests/panel/estatico-admin.test.ts` tiene que seguir en verde (sin `innerHTML`, sin `localStorage`, transiciones permitidas).
- **Sin cambios**: `src/`, `public/sim/arca.html`, `design-system/tokens.css`, `public/styles/tokens.css`.
- **Governance**: LOW. Es solo UI de navegación de lectura, y la API sigue haciendo cumplir rol y estado.
