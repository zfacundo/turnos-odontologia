> **Antes de empezar**: strict TDD. Cada tarea de código empieza con un test rojo, con nombre en formato dado / cuando / entonces (regla dura 8) y el comentario `// spec: panel-boton-emitir-factura`. Q-1 se resolvió el 2026-11-25 (team lead): admin incluido, ver el grupo 5.

## 1. Red de seguridad

- [x] 1.1 Correr `npm test` y `npm run typecheck`, y anotar el baseline (N tests en verde). Si algo falla antes de empezar, frenar y reportarlo como falla previa.

## 2. Funciones puras (TDD, sin DOM)

- [x] 2.1 RED→GREEN en `tests/panel/permisos-ui.test.ts`: `puedeEmitirFactura` devuelve `true` solo para `recepcion`, y `false` para `admin`, `odontologo`, `paciente` y `undefined`. Implementar en `public/admin/js/permisos-ui.js` y declarar en `permisos-ui.d.ts` (D1).
- [x] 2.2 RED→GREEN en `tests/panel/agenda-calculos.test.ts`, un test por escenario del spec:
  - recepción + `atendido` → `{ visible: true, habilitado: true, href: '/sim/arca.html?turnoId=t-1' }`;
  - recepción + `reservado`, `confirmado`, `cancelado` y `ausente` → visible, deshabilitada y sin `href`;
  - admin y odontólogo + `atendido` → no visible;
  - id `t 1/&?` → `href` `/sim/arca.html?turnoId=t%201%2F%26%3F`.
  - Implementar `accionFactura(rol, turno)` en `public/admin/js/agenda-calculos.js`, importando `puedeEmitirFactura`. Declararla en `agenda-calculos.d.ts` con el tipo de retorno `AccionFactura`.

## 3. Cableado en la agenda (verificación manual)

- [x] 3.1 En `public/admin/js/agenda.js` (`dibujarDetalle`), usar `accionFactura(usuario.rol, t)`:
  - habilitada → `<a class="btn btn-secondary" href>`;
  - deshabilitada → `<a>` sin `href` con `role="link"`, `aria-disabled="true"`, `aria-describedby="factura-ayuda"` y el `<p id="factura-ayuda">` "Disponible cuando el turno esté atendido".
  - Ajustar la condición del mensaje "sin acciones" (D4). Solo con `h(...)`, sin `innerHTML`.
- [x] 3.2 En `public/admin/admin.css`, sumar `.btn[aria-disabled="true"]` a la regla de `.btn[disabled]` (D3, aditivo).

## 4. Verificación

- [x] 4.1 Correr `npm test` y `npm run typecheck` en verde, incluido `tests/panel/estatico-admin.test.ts`.
- [x] 4.2 Verificación manual en el navegador (`npm run dev`, `/admin/`), solo con datos ficticios:
  - como recepción, en un turno `atendido`, "Emitir factura" abre `/sim/arca.html?turnoId=<id>` en la misma pestaña, con el turno precargado, y se puede emitir;
  - en un turno `reservado` o `confirmado`, el botón está deshabilitado, no navega y se ve el texto de ayuda;
  - como admin y como odontólogo, el botón no aparece;
  - con `Tab`, el foco no queda en el botón deshabilitado y `Escape` sigue cerrando el detalle.
  - **Verificado 2026-11-25 (team lead)** con `npm run dev`, seed y `SIM_NOW=2026-12-01T08:00:00-03:00` en el navegador integrado. Como recepción, el turno atendido de "Paciente Ficticio Cinco" muestra el enlace a `/sim/arca.html?turnoId=5043f26e-…`; al hacer clic se abre en la misma pestaña con el turno precargado y se emitió la Factura C 00001-00000001. El turno sin confirmar de "Paciente Ficticio Seis" muestra el botón con `aria-disabled="true"`, sin `href` y con "Disponible cuando el turno esté atendido". Con 6 `Tab` reales desde "✕", el foco salta el botón deshabilitado, y `Escape` cierra el detalle y devuelve el foco al turno. Admin (en los dos turnos) y `u-odonto-1` (en su turno atendido) no ven el botón ni el texto de ayuda.
- [x] 4.3 Dejar el handoff en `knowledge-base/entrega/panel-boton-emitir-factura.md`: qué se hizo, cómo se verificó y la pregunta abierta Q-1.

## 5. Incluir administración (Q-1)

- [x] 5.1 RED en `tests/panel/permisos-ui.test.ts` y `tests/panel/agenda-calculos.test.ts`: `puedeEmitirFactura('admin')` es `true`; `accionFactura('admin', atendido)` es visible, habilitada y con `href`; `accionFactura('admin', reservado)` es visible, deshabilitada y sin `href`; el odontólogo sigue sin verla. Correr y ver los tests fallar.
- [x] 5.2 GREEN en `public/admin/js/permisos-ui.js`: `puedeEmitirFactura` devuelve `true` para `recepcion` y `admin`. Verificar que `agenda.js` no necesita cambios (usa `accionFactura`). Suite completa y `npm run typecheck` en verde.
- [x] 5.3 Verificación manual en el navegador como admin (la hace el orquestador): en un turno `atendido`, "Emitir factura" abre `/sim/arca.html?turnoId=<id>` en la misma pestaña; en un turno `reservado` o `confirmado`, queda deshabilitada, sin navegar y con el texto de ayuda. El odontólogo no la ve. **Verificado 2026-11-25 (team lead)**: como Admin Ficticio, el turno atendido de "Paciente Ficticio Cinco" muestra el enlace a `/sim/arca.html?turnoId=5043f26e-…`; el clic lo abre en la misma pestaña con el turno precargado. El turno sin confirmar de "Paciente Ficticio Seis" muestra el botón con `aria-disabled="true"`, sin `href` y con el texto de ayuda.
