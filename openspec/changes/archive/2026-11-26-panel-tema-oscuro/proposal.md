## Why

El panel de administración (`/admin/`) solo tiene tema claro. Recepción y odontólogos lo usan muchas horas, a veces en consultorios con poca luz, y el usuario pidió un "tema negro". Hoy el sistema operativo puede pedir modo oscuro (`prefers-color-scheme: dark`) y el panel lo ignora.

## What Changes

- Tema oscuro para el panel `/admin/` **únicamente**, derivado de la misma paleta (#001040, #00457A, #0088BE, #97CAD9, #DCE8EE) con superficies **grafito neutro** (sin tinte azul) y la paleta azul solo como acento (cabeceras de tarjeta, día actual, selección, botón primario, foco y enlaces); el fondo exterior del login sigue navy.
- Botón de tema en la barra superior del shell y en la pantalla de login: nombre accesible, `aria-pressed`, operable con teclado.
- Por defecto sigue `prefers-color-scheme`; la elección del usuario se guarda en `localStorage` (clave `adm.tema`, solo `claro`/`oscuro`) y se aplica **antes del primer pintado** (sin destello de tema claro).
- Todas las vistas cubiertas: login, dashboard, agenda (estados del turno con el mismo significado y AA, estado también en texto), clientes, historial clínico, odontograma (rojo/azul de RN-OD-04 con las marcas "!" y "✓"), drawer, toasts, formularios y foco.
- Contraste WCAG AA en ambos temas (texto 4.5:1, elementos de interfaz y foco 3:1), con los ratios calculados en `design.md` y verificados por tests.
- Motion: el cambio de tema es instantáneo (sin transición de colores ni de layout); se respetan las reglas vigentes (solo `transform`/`opacity`, ease-out, < 300 ms, `prefers-reduced-motion`).
- Lógica pura `resolverTema` en `public/admin/js/tema-calculos.js` con `.d.ts`, cubierta por Vitest.
- Mockups claro vs oscuro de login, dashboard, agenda e historial con `Approval: pending`; las tareas visuales quedan bloqueadas hasta su aprobación.

Fuera de alcance: `public/bot.html`, simuladores, `design-system/` y cualquier otra página; un tercer estado "seguir al sistema" en la UI (ver Open Questions de `design.md`); tema de alto contraste.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `panel-admin`: se agregan requisitos de tema oscuro (selector, persistencia, default del sistema, sin destello, cobertura por vista, contraste en ambos temas, motion del cambio de tema) y se modifica "Tema propio del panel y aislamiento de estilos" para exigir AA en los dos temas.

## Impact

- **Archivos del panel (compartidos, zona de `panel-admin-agenda` / área de C-09)**: `public/admin/admin.css` (bloque nuevo al final, aditivo), `public/admin/index.html` (un `<script>` de arranque en `<head>` y el botón en topbar y login), `public/admin/js/main.js` (montaje del botón). Cambios **aditivos**; **requiere revisión del equipo / team lead** antes del merge (regla dura 11).
- **Archivos nuevos**: `public/admin/tema-arranque.js` (script clásico pre-pintado), `public/admin/js/tema-calculos.js` + `.d.ts`, `public/admin/js/tema.js`, `tests/panel/tema-calculos.test.ts`, `tests/panel/tema-arranque.test.ts`, `tests/panel/tema-estatico.test.ts`.
- `public/admin/js/dashboard.js`: 4 valores de color de barras pasan a `var(--adm-bar-…, <valor actual>)` (sin cambio en claro).
- Arreglo aditivo de un defecto previo del tema claro: el foco en la barra superior (`#97CAD9` sobre `#F7FAFC`, 1.70:1) pasa a `#0088BE` (3.81:1).
- **Test existente que cambia**: `tests/panel/estatico-admin.test.ts` prohíbe `localStorage` en `public/admin/js/*.js` (protege el token, S-3). Se acota para permitir `localStorage` solo con la clave `adm.tema` en los módulos de tema, manteniendo la prohibición para el token (ver design D4).
- `public/admin/js/agenda.js`: una línea (colores literales del swatch de bloqueo pasan a `var(--adm-…, <literal>)`).
- Sin cambios de API, dominio, datos ni dependencias. `design-system/tokens.css` y `public/styles/tokens.css` intactos.
- Governance: **LOW/MEDIUM** (solo UI, sin auth ni datos de pacientes).
