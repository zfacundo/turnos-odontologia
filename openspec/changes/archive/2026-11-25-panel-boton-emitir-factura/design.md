## Context

- La motivación está en `proposal.md`. Los requisitos, en `specs/panel-admin/spec.md`.
- El detalle del turno se dibuja en `public/admin/js/agenda.js`, en `dibujarDetalle`.
  - Las acciones salen de `accionesDisponibles(t)`: confirmar, atender, ausente y cancelar.
  - El enlace "Odontograma" es un `<a class="btn btn-secondary" href="#/odontograma/<id>">` que solo ve el odontólogo (`puedeVerOdontograma`).
  - Si no hay acciones ni odontograma, se muestra "Este turno no tiene acciones disponibles para tu rol.".
- Los permisos por rol son funciones puras en `public/admin/js/permisos-ui.js` (por ejemplo, `puedeCrearTurnos` y `puedeVerRegistro`). Los cálculos de la agenda son puros en `public/admin/js/agenda-calculos.js`. Los dos tienen su `.d.ts` y se prueban en `tests/panel/*.test.ts`.
- `public/sim/arca.html` lee `?turnoId=` con `URLSearchParams` y emite con el rol `recepcion`. Sin `turnoId`, muestra "Falta el turno".
- `src/simulators/arca/emitirFacturaC.ts` solo acepta turnos `atendido`, y permite `recepcion` y `admin` (spec `factura-c-simulada`).
- La agenda solo muestra turnos activos, así que en la práctica un turno `cancelado` no llega al detalle. Igual, la función pura lo cubre.
- `admin.css` tiene `.btn[disabled]` (opacidad .5, `not-allowed`), pero no tiene estilo para `aria-disabled`.

## Goals / Non-Goals

**Goals:**
- Que recepción vaya desde el detalle del turno a la Factura C con el turno ya elegido, con un solo click.
- Que la acción no ofrezca un camino que el simulador va a rechazar: solo se habilita con el turno `atendido`.
- Que toda la decisión sea pura y testeable.

**Non-Goals:**
- Cambiar `public/sim/arca.html`, la API o el simulador.
- Mostrar en el panel si el turno ya tiene factura. Si ya la tiene, la pantalla de ARCA muestra el rechazo `409` del simulador.
- Volver de ARCA a la agenda con el turno abierto.

## Decisions

### D1. Dos funciones puras: permiso y acción
- `puedeEmitirFactura(rol)` en `permisos-ui.js` devuelve `rol === 'recepcion' || rol === 'admin'`. Sigue el patrón de `puedeCrearTurnos` y `puedeVerOdontograma`.
- `accionFactura(rol, turno)` en `agenda-calculos.js` devuelve `{ visible, habilitado, href }`:
  - sin permiso → `{ visible: false, habilitado: false, href: undefined }`;
  - recepción con el turno `atendido` → `{ visible: true, habilitado: true, href: '/sim/arca.html?turnoId=' + encodeURIComponent(turno.id) }`;
  - recepción con otro estado → `{ visible: true, habilitado: false, href: undefined }`.
- `agenda-calculos.js` importa `puedeEmitirFactura` desde `./permisos-ui.js`, así el permiso tiene una sola fuente. Los dos son módulos ES sin DOM, y Vitest los importa igual.
- Alternativa descartada: poner la condición dentro de `agenda.js`. Ese archivo no se testea (toca el DOM) y la regla quedaría sin test.

### D2. Enlace cuando está habilitado; `<a>` sin `href` cuando no
- Habilitado: `h('a', { class: 'btn btn-secondary', href }, 'Emitir factura')`. Es navegación, igual que el enlace "Odontograma". Va en la misma pestaña, sin `target`.
- Deshabilitado: `h('a', { class: 'btn btn-secondary', role: 'link', 'aria-disabled': 'true', 'aria-describedby': 'factura-ayuda' }, 'Emitir factura')` y, debajo, `h('p', { class: 'small muted', id: 'factura-ayuda' }, 'Disponible cuando el turno esté atendido')`.
  - Un `<a>` sin `href` no navega ni recibe foco. La trampa de foco del drawer (`button, textarea, [href], select, input`) lo saltea solo.
  - El texto de ayuda queda visible para todos y el lector de pantalla lo anuncia al recorrer el detalle.
- Alternativa descartada: un `<button disabled>`. Cambia de elemento según el estado y un botón no es navegación. Se descarta para mantener un solo patrón de enlace.

### D3. Estilo aditivo
- En `admin.css`, se suma `.btn[aria-disabled="true"]` a la regla existente de `.btn[disabled]` (opacidad .5, `cursor: not-allowed`). No hay tokens nuevos ni transiciones nuevas, así que `estatico-admin.test.ts` sigue en verde.

### D4. Mensaje "sin acciones"
- La condición de "Este turno no tiene acciones disponibles para tu rol." pasa a tener en cuenta la acción de factura. Si la acción es visible, el mensaje no aparece. En la práctica, recepción siempre la ve, así que el mensaje deja de aparecer para recepción.

## Risks / Trade-offs

- [Riesgo] Una recepcionista podría querer facturar un turno que ya tiene factura. → Mitigación: el simulador responde `409` y `arca.html` ya muestra ese error. No se agrega una consulta extra al panel.
- [Trade-off] El botón deshabilitado ocupa lugar en todos los turnos no atendidos. Se acepta porque el pedido es que el botón aparezca al seleccionar un paciente, y el texto de ayuda explica cuándo se habilita.
- [Riesgo] `arca.html` emite siempre con el rol `recepcion`, sin usar el token del panel. Ya era así y este change no lo toca.

## Open Questions

- **Q-1 (resuelta, 2026-11-25, team lead: admin incluido)**: admin también ve "Emitir factura", con exactamente el mismo comportamiento que recepción (habilitada con turno `atendido`, deshabilitada con ayuda en cualquier otro estado). El odontólogo sigue sin verla. La API (`emitirFacturaC`) ya permitía `recepcion` y `admin`.
