## Context

Ver `proposal.md` (Why) y la delta `specs/panel-admin/spec.md` (requisitos). Estado actual relevante:

- El tema del panel vive en `public/admin/admin.css` (D10 de `panel-admin-agenda`): un único bloque `:root { … }` con tokens `--adm-*`, más reglas de componentes. Hay dos clases de tokens: **marca** (`--adm-navy`, `--adm-blue-700/500/300/100`) y **semánticos** (`--adm-bg`, `--adm-surface`, `--adm-text`, `--adm-st-*`, …). Varias reglas usan tokens de marca con significado semántico (p. ej. `.btn-secondary { color: var(--adm-navy) }`, `.toast { background: var(--adm-navy) }`) y hay literales (`#FFFFFF` en `.input`, `.grid-wrap`, `.user-opt`; `#E6EEF2`, `#F1F7FA`, `#F2F5F7`, `#EEF2F5`/`#E2E9EE` en la grilla; `#E9B9A9`, `#A9D6BC` en bordes de estado).
- JS con colores en línea: `agenda.js` (swatch de bloqueo con literales) y `dashboard.js` (barras por estado con `var(--adm-blue-300/500/700)` y `var(--adm-st-ausente-fg)`). `odontograma.js` e `historial.js` usan solo tokens.
- `tests/panel/estatico-admin.test.ts` ya verifica: tokens del primer `:root {` con prefijo `--adm-`, paleta presente, contrastes AA del tema claro, transiciones solo `transform`/`opacity`, duraciones ≤ 300 ms, bloque `prefers-reduced-motion`, `:hover` solo con puntero fino, grilla sin transiciones, **y que ningún `public/admin/js/*.js` mencione `localStorage`** (protección del token, S-3).
- `index.html` carga `admin.css`, `brand.js` (`defer`) y `js/main.js` (`type="module"`, diferido). No hay CSP (`app.ts` no usa helmet). El panel ya exige JavaScript (`<noscript>`).
- Módulos puros testeables: `*-calculos.js` + `.d.ts` hermano, tests en `tests/panel/` (entorno node, import ESM).
- **Hallazgo previo (tema claro)**: `.topbar :focus-visible { outline-color: var(--adm-focus-on-navy) }` dibuja `#97CAD9` sobre la barra superior clara (`#F7FAFC`): **1.70:1**, no cumple 3:1. La barra superior no es navy desde `panel-admin-agenda`. Se corrige acá (D9) porque el botón de tema vive en esa barra.
- Zona: `public/admin/*` es del área `panel-admin-agenda` (heredera de C-09). Todo cambio en `admin.css`, `index.html`, `main.js`, `agenda.js` y `dashboard.js` es **aditivo** y requiere revisión del equipo.

## Goals / Non-Goals

**Goals:**
- Tema oscuro completo con un solo punto de verdad de colores (tokens) y un bloque CSS aislado, fácil de revisar y de revertir.
- Cero destello: el atributo de tema existe en `<html>` antes de que se aplique la hoja de estilos.
- Lógica de resolución pura y testeada; contrastes verificados por tests, no solo por tabla.
- El tema claro no cambia visualmente (salvo el arreglo del foco de la barra superior, D9).

**Non-Goals:**
- Refactor general de `admin.css` a tokens semánticos (se hace solo lo necesario, por sobrescritura).
- Sincronizar el tema entre pestañas abiertas (evento `storage`): cada pestaña toma la elección al abrir.
- Tema de alto contraste o `forced-colors` específico (el navegador ya lo maneja).
- Tocar el bot, simuladores, `design-system/` o `public/styles/`.

## Decisions

### D1 — Mecanismo: atributo `data-tema` en `<html>` + bloque de sobrescritura
- `document.documentElement.dataset.tema = 'claro' | 'oscuro'` y `style.colorScheme = 'light' | 'dark'` (controles nativos y scrollbars, spec "Controles nativos en oscuro").
- `admin.css` suma **al final** una sección `/* ---------- panel-tema-oscuro (aditivo) ---------- */` con:
  1. `:root[data-tema="oscuro"] { color-scheme: dark; … }` que redefine **solo tokens semánticos** y agrega tokens nuevos (`--adm-surface-2`, `--adm-input-bg`, `--adm-sidebar-bg`, `--adm-grid-*`, `--adm-bloqueo-a/b`, `--adm-st-*-bd`, `--adm-bar-*`, `--adm-scrim`, `--adm-toast-*`). Los tokens de **marca** (`--adm-navy`, `--adm-blue-*`) **no se redefinen**: son la paleta y otras reglas los usan como texto.
  2. Reglas `[data-tema="oscuro"] .selector { … }` para cada componente que hoy usa un token de marca como color semántico o un literal (inventario en D9).
- El primer bloque `:root {` queda intacto, así el test existente (`tokens()` lee solo ese bloque) sigue validando el tema claro.
- *Alternativas*: `@media (prefers-color-scheme: dark)` puro (no permite elección del usuario); clase en `<body>` (no existe antes del pintado del `<head>`); redefinir `--adm-navy` en oscuro (rompe los textos navy y el significado de la paleta); refactor a tokens semánticos en todo el CSS (no aditivo, toca muchas líneas de un archivo compartido).

### D2 — Paleta oscura: grafito neutro con la paleta azul como acento
Pedido del usuario (revisión de mockups, capturas de referencia de login y agenda): superficies **grafito neutro, sin tinte azul**. La paleta (#001040, #00457A, #0088BE, #97CAD9, #DCE8EE) queda **solo como acento**: cabeceras de tarjeta (`.panel-head` "Calendario", "Agenda", "Lo que hizo el sistema"), día actual y selección, ítem activo del sidebar, KPI destacado, botón primario, foco y enlaces. El fondo exterior del login sigue **navy** (`#001040`, como en claro) y la tarjeta es grafito. Se descarta el negro puro (`#000`): con tinta clara produce halos en texto fino y no deja escalones de profundidad (página < sidebar). Se descarta el navy como superficie (primera versión de esta propuesta) por pedido explícito del usuario.

Escalones de profundidad: sidebar `#0F0F0F` < página `#161616` < superficie `#1F1F1F` < superficie-2 `#2A2A2A`. Tinta `#E8E8E8` (no blanco puro, menos deslumbrante).

| Token (oscuro) | Valor | Uso | Contraste (WCAG 2.x) |
|---|---|---|---|
| `--adm-bg` | `#161616` | fondo de página | — |
| `--adm-surface` | `#1F1F1F` | tarjetas, topbar, tarjeta de login, drawer, tablas, fondo de la grilla | — |
| `--adm-surface-2` (nuevo) | `#2A2A2A` | `.sim`, `.alert-info`, semana del mini-cal, pista de barras, hover secundario, bloque reservado | — |
| `--adm-sidebar-bg` (nuevo) | `#0F0F0F` | sidebar (más oscura que la página) | — |
| `--adm-input-bg` (nuevo) | `#171717` | inputs, selects, opciones de usuario del login (hundidos) | — |
| `--adm-line` | `#333333` | separadores y líneas de hora de la grilla | 1.30:1 (decorativo, exento) |
| `--adm-text` | `#E8E8E8` | texto principal | 13.45 surface · 14.77 bg · 11.71 surface-2 · 15.64 sidebar · 12.74 día actual · 11.26 fila seleccionada |
| `--adm-text-muted` | `#A8A8A8` | texto secundario | 6.93 surface · 7.61 bg · 6.04 surface-2 · 8.06 sidebar · 6.56 día actual · 7.39 día cerrado · 5.55 bloqueo |
| `--adm-link` | `#5CC0EA` | enlaces, `.btn-ghost`, `.btn-link` | 7.99 surface · 8.77 bg · 6.96 surface-2 |
| `--adm-accent` / `--adm-on-accent` | `#0088BE` / `#001040` (sin cambio) | botón primario, cara elegida | texto 4.59 · botón vs surface 4.13 · vs bg 4.54 · vs surface-2 3.60 |
| `--adm-control-border` | `#7A7A7A` | bordes de controles | 3.84 surface · 4.18 input · 4.22 bg · 3.34 surface-2 |
| `--adm-focus-color` | `#97CAD9` | foco 3px | 9.24 surface · 10.14 bg · 8.04 surface-2 · 10.74 sidebar · 5.52 `#00457A` · 10.25 navy del login |
| `--adm-focus-on-navy` | `#97CAD9` (sin cambio) | foco en sidebar y fondo del login | 10.74 sidebar · 10.25 navy |
| `--adm-on-navy` / `--adm-on-navy-muted` | `#FFFFFF` / `#B9D4E0` (sin cambio) | texto del sidebar | 19.17 / 12.37 sobre sidebar |
| Acento `#00457A` (sin cambio, `--adm-blue-700`) | `.panel-head`, `.wg-head.today`, `.nav a[aria-current]`, `.mini-cal .today` | texto blanco 9.85 |
| `--adm-st-reservado-bg/fg/bd` | `#2A2A2A` / `#E8E8E8` / `#97CAD9` punteado | reservado | texto 11.71 · borde vs surface 9.24 |
| `--adm-st-confirmado-bg/fg` | `#0088BE` / `#001040` (sin cambio) | confirmado | texto 4.59 · bloque vs surface 4.13 · vs día actual 3.91 |
| `--adm-st-atendido-bg/fg` + `-bd` (nuevo) | `#00457A` / `#FFFFFF` + borde `#5FA8D3` | atendido / pieza "hecho" (azul, "✓", RN-OD-04) | texto 9.85 · borde vs surface 6.30 · vs día actual 5.97 (el relleno solo daría 1.67) |
| `--adm-st-ausente-bg/fg` + `-bd` (nuevo) | `#4A1A0E` / `#FFC2AE` + borde `#E07A5A` | ausente | texto 9.40 · borde vs surface 5.57 |
| `--adm-senado-bg/fg` + `-bd` (nuevo) | `#0B3D26` / `#A6E3C3` + borde `#3F9A6C` | "$ Señado" | texto 8.42 · borde vs surface 4.75 |
| `--adm-error-bg/fg` + `--adm-error-bd` (nuevo) | `#4A1A0E` / `#FFC2AE` + `#FF8A66` | alertas, campo inválido, pieza "a revisar" (rojo, "!", RN-OD-04) | texto 9.40 sobre su fondo · 10.66 surface · 11.70 bg · borde 2px 7.13 surface · 7.75 input |
| `--adm-bar-reservado/confirmado/atendido/ausente` (nuevos) | `#97CAD9` / `#0088BE` / `#5FA8D3` / `#FFC2AE` | barras del dashboard sobre pista `#2A2A2A` | 8.04 / 3.60 / 5.49 / 9.28 (≥ 3:1 gráfico) |
| `--adm-grid-bg` (nuevo) | `#1F1F1F` | fondo de la grilla | — |
| `--adm-grid-line` (nuevo) | `#272727` | líneas de 15 min (sutiles; la hora en punto usa `--adm-line`) | 1.10 (15 min) / 1.30 (hora) (decorativas, exentas: la estructura la dan las etiquetas de hora) |
| `--adm-grid-today` (nuevo) | `#0F2633` | columna del día actual (tinte azul de acento) | texto 12.74 · muted 6.56 |
| `--adm-grid-closed` (nuevo) | `#191919` | día cerrado (más hundido) | muted 7.39 |
| `--adm-sel-bg` (nuevo) | `#13303F` | fila seleccionada de la tabla (tinte azul de acento) | texto 11.26 |
| `--adm-bloqueo-a/b` (nuevos) | `#262626` / `#303030` | rayado de bloqueo | muted 5.55 |
| `--adm-toast-bg/fg` (nuevos) | `#E8E8E8` / `#001040` | toast y enlace de salto invertidos | 14.93 |
| `--adm-scrim` (nuevo) | `rgba(0, 0, 0, .6)` | fondo del drawer | — |
| `--adm-shadow` | `0 1px 2px rgba(0, 0, 0, .5)` | tarjetas | — |
| KPI destacado | fondo `#00457A`, texto `#FFFFFF` / muted `#B9D4E0` | `.kpi-hero` | 9.85 / 6.36 |
| Opción de usuario elegida (login) | fondo `#2A2A2A`, borde 2px `#0088BE` | `.user-opt:has(:checked)` | borde 3.60 |

Líneas de la grilla: en la captura de referencia las líneas son demasiado fuertes (casi blancas) y compiten con los bloques. Se proponen sutiles (`#272727` cada 15 min, `#333333` cada hora): son decorativas (WCAG 1.4.11 no aplica; la posición se lee por las etiquetas de hora y el texto del bloque).

Referencias del tema claro (sin cambios): navy sobre `#0088BE` 4.59 (**blanco sobre `#0088BE` 3.99 ✗**, por eso el texto de botones primarios sigue navy en ambos temas), blanco sobre `#00457A` 9.85, foco `#0088BE` sobre `#F7FAFC` 3.81.

Reglas de significado: los cuatro estados conservan su "rampa" (reservado = contorno punteado claro, confirmado = azul vivo, atendido = azul profundo con texto blanco, ausente = única nota cálida); en oscuro cada bloque gana un borde ≥ 3:1 porque su relleno no siempre se distingue de la superficie. La leyenda usa las mismas clases `.st-*`, así coincide con los bloques por construcción. El estado sigue en texto / nombre accesible (sin cambios en JS).

### D3 — Lógica pura: `public/admin/js/tema-calculos.js` (+ `.d.ts`)
```ts
export type Tema = 'claro' | 'oscuro';
export const CLAVE_TEMA: 'adm.tema';
export function normalizarTema(valor: unknown): Tema | null;          // solo 'claro' | 'oscuro' exactos; todo lo demás → null
export function resolverTema(guardado: unknown, prefiereOscuro: boolean): Tema; // guardado válido gana; si no, el sistema
export function alternarTema(actual: Tema): Tema;
export function esquemaDeColor(tema: Tema): 'light' | 'dark';
```
Sin DOM ni storage: se testea con tablas de casos (`null`, `''`, `'negro'`, `'OSCURO'`, `42`, `'claro'`, `'oscuro'` × `prefiereOscuro` true/false).

### D4 — Persistencia en `localStorage` con clave única y test acotado
- Clave `adm.tema`, valores `claro`/`oscuro`. Se usa `localStorage` (no `sessionStorage`) porque la preferencia debe sobrevivir a cerrar la pestaña y a cerrar sesión; no es un dato sensible ni de paciente.
- Acceso con `try/catch` (ventana privada o storage bloqueado): si falla, el tema vive solo en memoria durante la visita (spec "Almacenamiento bloqueado").
- El tema **no** se borra al cerrar sesión (`sesion.olvidar()` no lo toca).
- `tests/panel/estatico-admin.test.ts`: la regla "ningún JS usa `localStorage`" se acota a: (a) solo `tema.js` puede mencionar `localStorage`, (b) en ese archivo toda clave usada es `CLAVE_TEMA`/`'adm.tema'`, (c) `api-admin.js`, `sesion.js` y `main.js` siguen sin mencionarlo. Así se conserva la protección del token (S-3). `tema-arranque.js` vive fuera de `js/` y tiene su propio test con la misma regla.
- *Alternativas*: cookie (viaja al servidor sin necesidad); `sessionStorage` (no cumple "sobrevive a cerrar la pestaña"); no persistir (el usuario re-elige cada vez).

### D5 — Arranque sin destello: `public/admin/tema-arranque.js` (script clásico síncrono)
- En `<head>`, **antes** de `<link rel="stylesheet" href="admin.css">`: `<script src="tema-arranque.js"></script>` (sin `defer`/`async`/`module`, así bloquea y corre antes del primer pintado). Es un archivo de ~15 líneas, IIFE, sin dependencias: lee `adm.tema` con `try/catch`, consulta `matchMedia('(prefers-color-scheme: dark)')`, resuelve con la misma regla que `resolverTema` y fija `data-tema` + `colorScheme` en `<html>`.
- Un script clásico no puede importar el módulo ESM, así que la regla de resolución (3 líneas) se **duplica** a propósito. Se controla con un test de paridad: `tests/panel/tema-arranque.test.ts` ejecuta el archivo con `node:vm` sobre `window`/`document`/`localStorage` falsos para toda la tabla de casos de D3 y exige el mismo resultado que `resolverTema`.
- *Alternativas*: script inline en `index.html` (impide una CSP estricta futura sin hash y es más difícil de testear); módulo ESM o `defer` (corre después del pintado → destello); CSS `@media (prefers-color-scheme)` como base (no respeta la elección guardada antes del JS).

### D6 — Botón de tema (`public/admin/js/tema.js`, montado desde `main.js`)
- Marcado estático en `index.html` (dos botones: login y topbar) para que existan antes del JS de módulo: `<button class="icon-btn tema-btn" type="button" data-tema-toggle aria-pressed="false" aria-label="Tema oscuro" title="Tema oscuro">` con un ícono SVG `aria-hidden` (luna; sol cuando está activo el oscuro, solo decorativo). El nombre accesible es fijo ("Tema oscuro") y el estado lo da `aria-pressed`, patrón de botón conmutador (evita nombres que cambian).
- Ubicación: en la topbar entre el bloque de usuario y "Cerrar sesión"; en el login, arriba a la derecha de `.login-wrap` (fuera de la tarjeta, alineado con el rótulo SIMULACIÓN). 44×44 px (`--adm-tap`). En < 768px se mantiene visible (no va al menú).
- `tema.js` (DOM + storage, delgado): `iniciarTema({ documento, almacen, matchMedia })` lee el estado real de `<html>` (lo fijó el arranque), sincroniza `aria-pressed` de todos los `[data-tema-toggle]`, en click alterna con `alternarTema`, guarda y actualiza. Mientras no haya elección guardada escucha `change` del `matchMedia`; al guardar una elección deja de seguir al sistema. `button` nativo → `Enter`/`Space` gratis.
- `main.js`: una línea de import y una llamada `iniciarTema(...)` al arrancar (aditivo). El re-render de vistas no recrea los botones (viven fuera de `#contenido`), así cambiar de tema no toca formularios ni la sección.

### D7 — Motion del cambio de tema
- Instantáneo: el bloque oscuro **no** declara `transition` de colores. Las transiciones existentes son solo de `transform`/`opacity`, por lo que cambiar `data-tema` no dispara ninguna, y las animaciones de entrada (`kpi-in`, `login-in`) no se reinician porque la propiedad `animation` no cambia.
- No se usa fundido de opacidad de página completa: con `<300ms` igual parpadea el contenido y no aporta (es una acción repetible, regla de Emil: lo frecuente no se anima). El único movimiento es el `:active { transform: scale(0.97) }` que el botón hereda de `.icon-btn`/`.btn` si corresponde, ya anulado por `prefers-reduced-motion`.
- Test estático: el bloque oscuro no contiene `transition` ni `animation`.

### D8 — Cobertura por vista
Cada vista hereda los tokens; donde hay literales o tokens de marca usados como color semántico se agrega una regla `[data-tema="oscuro"]` (inventario D9). Se verifica con: tests estáticos de contraste sobre el bloque oscuro (tokens efectivos = claro ∪ sobrescrituras), un test que lista los literales `#FFFFFF`/`#E6EEF2`/`#F1F7FA`/`#F2F5F7`/`#EEF2F5`/`#E2E9EE`/`#E9B9A9`/`#A9D6BC` fuera de `:root` y exige que cada selector que los usa tenga su sobrescritura oscura, y una verificación en navegador (Edge headless, como la de `panel-admin-agenda`) de las vistas en ambos temas a 1440 y 390.

### D9 — Inventario de sobrescrituras y ediciones aditivas
- **CSS (`[data-tema="oscuro"] …`)**: `.sim`, `.alert-info`, `.btn-secondary` (+ hover), `.icon-btn`, `.input`/`.select`/`.filters .select`, `.user-opt` (+ `:checked`, `accent-color`), `.login-card` (borde `--adm-line`; `.login-page` **no** se sobrescribe: el fondo exterior sigue navy) y `.login-card .brand`, `.sidebar`, `.kpi-hero`, `.bar-track`, `.mini-cal .week td`, `.grid-wrap`, `.wg-head` (+ borde inferior `#0088BE`), `.wg-col` (líneas), `.wg-col.today`, `.wg-col.closed`, `.bloqueo`, `.st-atendido`/`.st-ausente`/`.senado` (bordes), `.table th` (borde `#0088BE`), `.table tr.sel td` (`--adm-sel-bg`), `.drawer-scrim`, `.drawer` (sombra), `.toast`, `.skip-link`, `.pieza.hecho` (borde), `.pieza.a_revisar`/`.input[aria-invalid]`/`.select[aria-invalid]` (borde `--adm-error-bd`).
- **Arreglo de foco (ambos temas)**: `.topbar :focus-visible { outline-color: var(--adm-focus-color) }` (claro: `#0088BE` sobre `#F7FAFC` 3.81; oscuro: `#97CAD9` sobre `#001040` 10.25). Se agrega como regla nueva posterior, no se edita la original.
- **`agenda.js`** (1 línea): `#EEF2F5`/`#E2E9EE` → `var(--adm-bloqueo-a, #EEF2F5)`/`var(--adm-bloqueo-b, #E2E9EE)`.
- **`dashboard.js`** (4 valores): `var(--adm-blue-300)` → `var(--adm-bar-reservado, var(--adm-blue-300))`, ídem confirmado/atendido/ausente. En tema claro el fallback da exactamente el color actual.

### D10 — Mockups como gate
`openspec/changes/panel-tema-oscuro/mockups/`: `login.html`, `dashboard.html`, `agenda.html`, `historial.html` (copias de los mockups aprobados de `panel-admin-agenda` con el botón de tema), `comparar.html` (claro y oscuro lado a lado con `iframe ?tema=`), `adm.css` (copia de la base aprobada), `adm-oscuro.css` (bloque oscuro propuesto = futuro bloque aditivo de `admin.css`), `tema-arranque.js` y `tema.js` (versión de mockup; aceptan `?tema=` solo para comparar). `README.md` con `Approval: pending`. Las tareas visuales (grupos 3+) no empiezan hasta `approved`; el grupo 1 (lógica pura) puede avanzar.

## Risks / Trade-offs

- [Regla de resolución duplicada en `tema-arranque.js`] → test de paridad con `node:vm` sobre toda la tabla de casos.
- [Acotar el test de `localStorage` debilita S-3] → la regla nueva es más precisa: whitelist de un archivo y una clave, y los archivos del token siguen sin poder mencionarlo.
- [Sobrescrituras por selector se desincronizan si alguien agrega un literal nuevo] → test que detecta literales claros fuera de `:root` sin sobrescritura oscura.
- [Archivos compartidos del panel] → solo bloque nuevo al final de `admin.css`, 2 botones + 1 `<script>` en `index.html`, 2 líneas en `main.js`, 1 en `agenda.js`, 4 valores con fallback en `dashboard.js`; PR con revisión del equipo.
- [`.turno.pasado { opacity: .55 }` baja el contraste del texto en ambos temas] → preexistente; fuera de alcance, anotado.
- [Script síncrono en `<head>` agrega una petición bloqueante] → archivo < 1 KB, mismo origen, cacheable; costo menor que el destello.

## Migration Plan

1. Grupo 1 (lógica pura y tests) sin depender de mockups.
2. Tras `Approval: approved` en `mockups/README.md`: CSS, arranque, botón, ajustes de JS, verificación en navegador.
3. Rollback: borrar el bloque `panel-tema-oscuro` de `admin.css`, el `<script>` y los botones de `index.html`, la llamada de `main.js` y los archivos nuevos; los fallbacks de `agenda.js`/`dashboard.js` pueden quedar (no cambian el tema claro). La clave `adm.tema` que quede en navegadores es inocua.

## Open Questions

Cada una tiene un default recomendado; si el usuario no responde, se aplica el default sin cambiar specs ni tareas.

1. **¿Ofrecer una forma de "volver a seguir al sistema"?** Default: **no** en la UI (botón de dos estados); la elección es definitiva hasta que se alterne de nuevo. Un tercer estado se puede sumar después sin cambiar `resolverTema`.
2. **¿Ícono solo o ícono + texto en el botón?** Default: **ícono solo** de 44×44 con `aria-label` y `title` "Tema oscuro"; la topbar mobile no tiene lugar para texto.
3. **Color de "atendido" en oscuro**: Default: **mantener el azul profundo `#00457A` con texto blanco y borde `#5FA8D3`** (misma rampa que en claro). Alternativa: invertir a azul claro `#97CAD9` con texto navy (más brillante, pero cambia la lectura "más oscuro = más avanzado").
4. **Sidebar en oscuro**: Default: **más oscura que la página (`#0F0F0F` < `#161616`)**, como en la captura de referencia, para separar la navegación sin bordes. Alternativa: igual a la página con borde derecho `--adm-line`.
